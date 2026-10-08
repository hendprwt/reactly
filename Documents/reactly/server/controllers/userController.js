const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment'); // [FIX] Import Comment model

// === DEFINISI POPULATE (FIXED) ===
// Gunakan Array agar bisa populate 'quoteOf' (Post) DAN 'quoteCommentOf' (Comment)
const quotePopulate = [
  { 
    path: 'quoteOf', 
    select: 'author handle avatar content image isVerified createdAt' 
  },
  { 
    path: 'quoteCommentOf', 
    select: 'author handle avatar content image isVerified createdAt' 
  }
];

// 1. GET USER PROFILE
exports.getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    const userCountBefore = await User.countDocuments({ createdAt: { $lt: user.createdAt } });
    const userNumber = userCountBefore + 1;

    let mutuals = [];
    if (user.followers && user.followers.length > 0) {
       mutuals = await User.find({ _id: { $in: user.followers.slice(0, 3) } })
                      .select('username avatar fullName');
    }

    res.json({ ...user.toObject(), userNumber, mutuals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    
    // 1. Cari User berdasarkan username
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userIdStr = user._id.toString();

    // 2. Query Post: 
    // - Buatan User sendiri (userId == user._id)
    // - ATAU Hasil Repost User (user._id ada di array reposts)
    const rawPosts = await Post.find({
      $or: [
        { userId: user._id }, 
        { reposts: user._id } 
      ]
    })
    .populate('userId', 'username fullName avatar isVerified') // Data Author
    .populate(quotePopulate) // Data Quote (Penting!)
    .sort({ pinned: -1, createdAt: -1 }); // SORTING: Pinned dulu, baru tanggal terbaru

    // 3. Proses Labeling Repost
    // Kita perlu membedakan mana post asli user dan mana hasil repost
    const finalPosts = rawPosts.map(post => {
      const postObj = post.toObject();

      // Cek apakah ini hasil repost oleh user profil ini?
      // Syarat: User ada di list reposts DAN User bukan pembuat post aslinya
      const isRepostedByThisUser = post.reposts.some(id => id.toString() === userIdStr);
      const isNotAuthor = post.userId._id.toString() !== userIdStr;

      if (isRepostedByThisUser && isNotAuthor) {
        postObj.isRepost = true;
        postObj.repostedBy = user.username; // Nama user yang me-repost (pemilik profil)
      } else {
        postObj.isRepost = false;
      }

      return postObj;
    });

    res.json(finalPosts);
  } catch (err) {
    console.error("Error getUserPosts:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 2. GET USER HIGHLIGHTS (Hanya Pinned Posts)
// ==========================================
exports.getUserHighlights = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Query khusus: Hanya ambil yang pinned: true milik user tersebut
    const highlights = await Post.find({ 
      userId: user._id, 
      pinned: true 
    })
    .populate('userId', 'username fullName avatar isVerified')
    .populate(quotePopulate) // Tetap populate quote biar tampilannya bagus
    .sort({ createdAt: -1 }); // Urutkan dari yang baru disematkan/dibuat

    res.json(highlights);
  } catch (err) {
    console.error("Error getUserHighlights:", err);
    res.status(500).json({ message: err.message });
  }
};

// 3. UPDATE PROFILE
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, bio, location, website, category, pronouns } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullName !== undefined) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (category !== undefined) user.category = category;
    if (pronouns !== undefined) user.pronouns = pronouns;

    if (req.files) {
      if (req.files.avatar) user.avatar = `http://localhost:5000/uploads/${req.files.avatar[0].filename}`;
      if (req.files.coverImage) user.coverImage = `http://localhost:5000/uploads/${req.files.coverImage[0].filename}`;
    }

    await user.save();

    // Sinkronisasi data user ke postingan lama
    await Post.updateMany(
      { handle: `@${user.username}` }, 
      { 
        $set: { 
          author: user.fullName || user.username,
          avatar: user.avatar,
          isVerified: user.isVerified
        } 
      }
    );
    // [OPTIONAL] Sinkronisasi ke Comment juga jika perlu
    await Comment.updateMany(
      { handle: `@${user.username}` },
      {
        $set: {
          author: user.fullName || user.username,
          avatar: user.avatar,
          isVerified: user.isVerified
        }
      }
    );

    const updatedUser = user.toObject();
    delete updatedUser.password;
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. FOLLOW USER
exports.followUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUsername = req.params.username;
    const targetUser = await User.findOne({ username: targetUsername });
    
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (currentUserId === targetUser._id.toString()) return res.status(400).json({ message: "Self follow error" });
    if (targetUser.followers.includes(currentUserId)) return res.status(400).json({ message: "Already following" });

    await targetUser.updateOne({ $push: { followers: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $push: { following: targetUser._id } });

    res.json({ message: "User followed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. UNFOLLOW USER
exports.unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUsername = req.params.username;
    const targetUser = await User.findOne({ username: targetUsername });

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    await targetUser.updateOne({ $pull: { followers: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUser._id } });

    res.json({ message: "User unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Search User
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query; 
    if (!q) return res.json([]);

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } }, 
        { fullName: { $regex: q, $options: 'i' } }
      ]
    }).select('username fullName avatar isVerified').limit(5);

    const formatted = users.map(u => ({
      id: u.username, 
      display: `@${u.username}`,
      avatar: u.avatar,
      fullName: u.fullName
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ... import User, Post, Comment di atas ...

// [BARU] 3. GET USER REPLIES
exports.getUserReplies = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ambil komentar user, dan populate post aslinya
    const replies = await Comment.find({ userId: user._id })
      .populate('postId') // Agar kita bisa tampilkan "Replying to..."
      .populate('userId', 'username fullName avatar isVerified')
      .sort({ createdAt: -1 });

    res.json(replies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// [BARU] 4. GET USER MEDIA (Posts with Image)
exports.getUserMedia = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cari post user yang field 'image' tidak null/kosong
    const mediaPosts = await Post.find({ 
      userId: user._id, 
      image: { $ne: null } 
    })
    .populate('userId', 'username fullName avatar isVerified')
    .sort({ createdAt: -1 });

    res.json(mediaPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// [BARU] 5. GET USER LIKES
exports.getUserLikes = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cari semua post di mana ID user ini ada di array 'likes'
    const likedPosts = await Post.find({ likes: user._id })
      .populate('userId', 'username fullName avatar isVerified')
      .sort({ createdAt: -1 }); // Urutkan dari yang baru dilike (idealnya butuh field 'likedAt' di relasi, tapi ini cukup)

    res.json(likedPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
