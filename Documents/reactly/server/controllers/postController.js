const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Redis = require('ioredis');

// === KONFIGURASI REDIS ===
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// === HELPER: SOCKET NOTIF ===
const sendRealTimeNotification = (req, recipientId, notificationData) => {
  const io = req.app.get('io');
  const receiverSocketId = global.onlineUsers.get(recipientId.toString());
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('getNotification', notificationData);
  }
};

// === HELPER: STREAM TO AI (CORE V3 ENGINE) ===
// Mengirim event aktivitas ke Redis Stream agar diproses oleh Python
async function streamToAI(type, data, user) {
    try {
        const payload = {
            type: type, // 'post', 'reply', 'repost', 'vote'
            id: data._id.toString(),
            text: data.content || "",
            timestamp: Date.now(),
            userId: user._id.toString(),
            username: user.username,
            isVerified: user.isVerified,
            // Context IDs (Penting untuk Conversation-Aware)
            parentId: data.postId ? data.postId.toString() : null, // Untuk Reply
            quoteId: data.quoteOf ? data.quoteOf.toString() : null // Untuk Quote
        };
        
        // Kirim ke Stream 'post_stream'
        await redis.xadd('post_stream', '*', 'data', JSON.stringify(payload));
    } catch (e) {
        console.error("⚠️ AI Stream Error:", e.message);
    }
}

const quotePopulate = [
  { path: 'quoteOf', select: 'author handle avatar content image isVerified createdAt' },
  { path: 'quoteCommentOf', select: 'author handle avatar content image isVerified createdAt' }
];

// 1. GET ALL POSTS
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate(quotePopulate).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { content, quoteOf, quoteCommentOf, poll, gifUrl } = req.body;
    const user = await User.findById(req.user.id).select('username fullName avatar isVerified followers'); 
    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle Files
    let imageFilenames = [];
    let videoFilename = null;
    if (req.files) {
        if (req.files['images']) imageFilenames = req.files['images'].map(file => file.filename);
        if (req.files['video']) videoFilename = req.files['video'][0].filename;
    }

    // Handle Poll
    let pollData = null;
    if (poll) {
        try {
            const parsedPoll = JSON.parse(poll);
            if (parsedPoll.options && parsedPoll.options.length >= 2) {
                pollData = {
                    question: content || "Poll",
                    options: parsedPoll.options.map(opt => ({ text: opt, votes: [] })),
                    expiresAt: new Date(Date.now() + (parsedPoll.days || 1) * 24 * 60 * 60 * 1000)
                };
            }
        } catch (e) { console.error("Poll parsing error:", e); }
    }

    if ((!content || content.trim() === "") && imageFilenames.length === 0 && !videoFilename && !pollData && !gifUrl) {
        return res.status(400).json({ message: "Post cannot be empty." });
    }

    const newPost = new Post({
      userId: user._id,
      author: user.fullName || user.username,
      handle: `@${user.username}`,
      avatar: user.avatar,
      isVerified: user.isVerified,
      content: content || "", 
      images: imageFilenames,           
      image: imageFilenames[0] || null, 
      video: videoFilename, 
      gifUrl: gifUrl || null,
      poll: pollData,       
      quoteOf: quoteOf || null,
      quoteCommentOf: quoteCommentOf || null
    });

    const savedPost = await newPost.save();

    // 🔥 V3: KIRIM SINYAL KE AI (Post Baru)
    // Biarkan Python yang menentukan topik dan skor trendingnya
    await streamToAI('post', savedPost, user);
    
    // Notifikasi Real-time Follower
    const io = req.app.get('io');
    if (user.followers && user.followers.length > 0) {
      user.followers.forEach(followerId => {
        const followerSocketId = global.onlineUsers.get(followerId.toString());
        if (followerSocketId) {
          io.to(followerSocketId).emit('newPostAvailable', {
            postId: savedPost._id, userId: user._id.toString(), author: user.username
          });
        }
      });
    }

    // Notifikasi Quote/Reply
    if (quoteOf || quoteCommentOf) {
      const targetId = quoteOf || quoteCommentOf;
      const targetModel = quoteOf ? Post : Comment;
      const targetData = await targetModel.findById(targetId);
      
      if (targetData && targetData.userId.toString() !== user._id.toString()) {
        const notif = await new Notification({
          recipient: targetData.userId, sender: user._id, type: 'quote', postId: savedPost._id
        }).save();
        await notif.populate('sender', 'username fullName avatar isVerified');
        sendRealTimeNotification(req, targetData.userId, notif);
      }
    }

    if (typeof quotePopulate !== 'undefined') await savedPost.populate(quotePopulate);
    res.status(201).json(savedPost);

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// 3. GET REALTIME TRENDING (FETCH DARI REDIS HASIL OLAHAN PYTHON)
exports.getRealtimeTrending = async (req, res) => {
    try {
        // Ambil Top 10 Trending (Velocity Score)
        const rawData = await redis.zrevrange('trending_scores', 0, 9, 'WITHSCORES');
        
        const formatted = [];
        for (let i = 0; i < rawData.length; i += 2) {
            const topic = rawData[i];
            const score = parseFloat(rawData[i+1]);
            
            // Ambil Metadata dari Hash 'topic_meta_data' yang diisi Python
            const metaRaw = await redis.hget('topic_meta_data', topic);
            const meta = metaRaw ? JSON.parse(metaRaw) : { count: 0, category: 'General' };

            // Format Angka (1200 -> 1.2K Posts)
            let postCountDisplay = meta.count;
            if (meta.count > 1000) postCountDisplay = (meta.count / 1000).toFixed(1) + 'K';

            formatted.push({
                topic: topic,
                type: topic.startsWith('#') ? 'Hashtag' : 'Topic', 
                posts: postCountDisplay + " posts",
                score: score, // Velocity Score
                category: meta.category
            });
        }
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.json([]); 
    }
};

// 4. GET POST DETAIL
exports.getPostDetail = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
      .populate('userId', 'fullName username avatar isVerified').populate(quotePopulate);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comments = await Comment.find({ postId: req.params.id })
      .populate('userId', 'fullName username avatar isVerified').sort({ createdAt: -1 });
    const quoteCount = await Post.countDocuments({ quoteOf: req.params.id });
    
    res.json({ post: { ...post._doc, quoteCount: quoteCount || 0, views: post.views }, comments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 5. GET POST ACTIVITY
exports.getPostActivity = async (req, res) => {
  try {
    const { id } = req.params; const { type } = req.query;
    let target = await Post.findById(id); let isComment = false;
    if (!target) { target = await Comment.findById(id); isComment = true; }
    if (!target) return res.status(404).json({ message: "Not found" });

    if (type === 'quotes') {
      const query = isComment ? { quoteCommentOf: id } : { quoteOf: id };
      const quotes = await Post.find(query).populate('userId', 'fullName username avatar isVerified').populate(quotePopulate).sort({ createdAt: -1 });
      return res.json(quotes);
    } 
    else if (type === 'likes') { await target.populate('likes', 'fullName username avatar isVerified bio'); return res.json(target.likes || []); } 
    else if (type === 'reposts') { await target.populate('reposts', 'fullName username avatar isVerified bio'); return res.json(target.reposts || []); }
    res.json([]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 6. LIKE POST
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = req.user.id;

    if (post.likes.includes(userId)) {
      post.likes.pull(userId);
      // Kurangi interest saat unlike (-1)
      if (post.category) {
        await redis.hincrby(`user:interest:${userId}`, post.category, -1);
      }
      await Notification.findOneAndDelete({ sender: userId, recipient: post.userId, type: 'like', postId: post._id });
    } else {
      post.likes.push(userId);
      // ✅ FIX: Update interest saat like — sinyal terkuat bahwa user tertarik konten ini
      if (post.category) {
        await redis.hincrby(`user:interest:${userId}`, post.category, 3); // Like = +3 poin
      }
      if (post.userId.toString() !== userId) {
        const notif = await new Notification({
          recipient: post.userId, sender: userId, type: 'like', postId: post._id
        }).save();
        await notif.populate('sender', 'username fullName avatar isVerified');
        sendRealTimeNotification(req, post.userId, notif);
      }
    }
    await post.save();
    if (typeof quotePopulate !== 'undefined') await post.populate(quotePopulate);
    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// 7. REPOST POST
exports.repostPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const user = await User.findById(req.user.id); // Butuh object user lengkap untuk stream
    const userId = req.user.id;

    if (post.reposts.includes(userId)) {
      post.reposts.pull(userId);
      await Notification.findOneAndDelete({ sender: userId, recipient: post.userId, type: 'repost', postId: post._id });
    } else {
      post.reposts.push(userId);
      
      // 🔥 V3: Repost = Amplifikasi (Kirim ke AI)
      // Kita sertakan konten asli post agar AI tahu topik apa yang diviralkan
      await streamToAI('repost', { _id: post._id, content: post.content }, user);

      if (post.userId.toString() !== userId) {
        const notif = await new Notification({
          recipient: post.userId, sender: userId, type: 'repost', postId: post._id
        }).save();
        await notif.populate('sender', 'username fullName avatar isVerified');
        sendRealTimeNotification(req, post.userId, notif);
      }
    }
    await post.save();
    await post.populate(quotePopulate);
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 8. BOOKMARK POST
exports.bookmarkPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user.id;
    if (post.bookmarks.includes(userId)) {
      post.bookmarks.pull(userId);
    } else {
      post.bookmarks.push(userId);
      // ✅ Bookmark = sinyal minat sangat kuat (user sengaja simpan konten ini)
      if (post.category) {
        await redis.hincrby(`user:interest:${userId}`, post.category, 5); // Bookmark = +5 poin
      }
    }
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 9. ADD COMMENT (REPLY)
exports.addComment = async (req, res) => {
  try {
    const { content, parentId, gifUrl } = req.body;
    const postId = req.params.id;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let imageValue = null;
    if (req.file) imageValue = req.file.filename;
    else if (gifUrl) imageValue = gifUrl;

    if (!content && !imageValue) return res.status(400).json({ message: "Comment must have content or image" });

    const newComment = new Comment({
      postId: postId, userId: user._id, parentId: parentId || null,
      author: user.fullName || user.username, handle: `@${user.username}`,
      avatar: user.avatar, isVerified: user.isVerified,
      content: content || "", image: imageValue
    });

    await newComment.save();
    if (parentId) await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });

    // 🔥 V3: Reply = Percakapan (Sangat Penting untuk Trending)
    // AI akan mencari topik dari parent post di MongoDB
    await streamToAI('reply', newComment, user);

    let recipientId = null;
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (parentComment) recipientId = parentComment.userId;
    } else {
      const post = await Post.findById(postId);
      if (post) recipientId = post.userId;
    }

    if (recipientId && recipientId.toString() !== user._id.toString()) {
      const notif = await new Notification({
        recipient: recipientId, sender: user._id, type: 'reply', postId: postId, commentId: newComment._id
      }).save();
      await notif.populate('sender', 'username fullName avatar isVerified');
      sendRealTimeNotification(req, recipientId, notif);
    }
    res.status(201).json(newComment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 10. LIKE COMMENT
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const userId = req.user.id;
    if (comment.likes.includes(userId)) comment.likes.pull(userId);
    else comment.likes.push(userId);
    await comment.save();
    res.json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 11. REPOST COMMENT
exports.repostComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const userId = req.user.id;
    if (comment.reposts.includes(userId)) comment.reposts.pull(userId);
    else comment.reposts.push(userId);
    await comment.save();
    res.json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 12. GET COMMENT DETAIL
exports.getCommentDetail = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
      .populate('userId', 'username fullName avatar isVerified');
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const originalPost = await Post.findById(comment.postId);
    const replies = await Comment.find({ parentId: comment._id }).sort({ createdAt: -1 });
    const quoteCount = await Post.countDocuments({ quoteCommentOf: req.params.id });
    res.json({ comment: { ...comment._doc, quoteCount: quoteCount || 0 }, originalPost, replies });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 13. TOGGLE PIN
exports.togglePin = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.userId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    if (!post.pinned) {
      const pinnedCount = await Post.countDocuments({ userId: req.user.id, pinned: true });
      if (pinnedCount >= 2) return res.status(400).json({ message: "Max 2 pinned posts allowed" });
    }
    post.pinned = !post.pinned;
    await post.save();
    res.json({ message: post.pinned ? "Post pinned" : "Post unpinned", pinned: post.pinned });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 14. DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.userId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 15. VOTE POST
exports.votePost = async (req, res) => {
  try {
    const { id } = req.params; const { optionIndex } = req.body; const userId = req.user.id;
    
    // Cari Post dan User
    const post = await Post.findById(id);
    const user = await User.findById(userId); // Butuh object user lengkap untuk stream

    if (!post || !post.poll) return res.status(404).json({ message: "Poll not found" });
    if (new Date() > new Date(post.poll.expiresAt)) return res.status(400).json({ message: "Poll has ended" });
    if (post.poll.options.some(opt => opt.votes.includes(userId))) return res.status(400).json({ message: "You have already voted" });
    
    post.poll.options[optionIndex].votes.push(userId);
    await post.save();

    // 🔥 V3: Vote adalah bentuk partisipasi (Kirim ke AI)
    // Konten voting (pilihan opsi) bisa jadi konteks, tapi kita kirim content post-nya saja
    if (user) await streamToAI('vote', post, user);

    // Notifikasi Vote
    if (post.userId.toString() !== userId) {
        const existingNotif = await Notification.findOne({ recipient: post.userId, postId: post._id, type: 'vote' });
        const io = req.app.get('io'); 
        if (existingNotif) {
            if (!existingNotif.senders) existingNotif.senders = [];
            if (!existingNotif.senders.some(s => s.toString() === userId)) {
                existingNotif.senders.push(userId); 
                existingNotif.sender = userId; existingNotif.read = false; existingNotif.updatedAt = new Date();
                await existingNotif.save();
                await existingNotif.populate('sender', 'username fullName avatar');
                if (io) { const sId = global.onlineUsers.get(post.userId.toString()); if (sId) io.to(sId).emit('getNotification', existingNotif); }
            }
        } else {
            const newNotif = new Notification({ recipient: post.userId, sender: userId, senders: [userId], type: 'vote', postId: post._id });
            await newNotif.save(); await newNotif.populate('sender', 'username fullName avatar');
            if (io) { const sId = global.onlineUsers.get(post.userId.toString()); if (sId) io.to(sId).emit('getNotification', newNotif); }
        }
    }
    res.json({ poll: post.poll });
  } catch (err) { res.status(500).json({ message: err.message }); }
};