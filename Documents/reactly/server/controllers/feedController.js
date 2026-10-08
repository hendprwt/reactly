// === [WAJIB] IMPORT UNTUK KOMUNIKASI KE PYTHON ===
const axios = require('axios'); 
const AI_RANKER_URL = 'http://127.0.0.1:5001/rank'; 

const Post = require('../models/Post');
const User = require('../models/User');
const Redis = require('ioredis');
const mongoose = require('mongoose');

// Inisialisasi Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

const feedPopulate = [
  { path: 'userId', select: 'username fullName avatar isVerified' },
  { path: 'quoteOf', populate: { path: 'userId', select: 'username fullName avatar isVerified' } },
  { path: 'reposts', select: 'username fullName' }
];

// Helper: Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 1. GET FOLLOWING FEED (Simple Chronological)
exports.getFollowingFeed = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const user = await User.findById(userId).select('following');
        const followingIds = user.following || [];
        followingIds.push(userId);
        
        const posts = await Post.find({ userId: { $in: followingIds } })
          .populate(feedPopulate)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));
        res.json(posts);
      } catch (err) { res.status(500).json({ message: err.message }); }
};

// 2. GET "FOR YOU" FEED (V4: Diversity & Impression Aware)
exports.getForYouFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // A. CONTEXT USER & IMPRESSION MEMORY
    const currentUser = await User.findById(userId).select('following muted');
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const followingList = currentUser.following || [];
    const mutedList = currentUser.muted || [];
    
    // [BARU] Ambil Data Impression (History Post yang sudah dilihat user)
    // Key: user:impressions:{userId} -> Hash Map { postId: count }
    // Kita set TTL 24 jam untuk key ini di Redis agar reset tiap hari
    const impressionKey = `user:impressions:${userId}`;
    const impressionMap = await redis.hgetall(impressionKey);

    // Ambil Minat
    const interestsMap = await redis.hgetall(`user:interest:${userId}`) || {};
    const sortedInterests = Object.entries(interestsMap)
        .sort(([,a], [,b]) => parseInt(b) - parseInt(a))
        .map(([key]) => key).slice(0, 5);

    // ✅ Deteksi akun baru (belum punya interest & belum follow siapapun)
    const isNewUser = sortedInterests.length === 0 && followingList.length === 0;

    // B. FETCH KANDIDAT
    // Perpanjang window dari 3 hari → 7 hari agar konten tidak langsung kosong
    const commonMatch = {
        userId: { $nin: [currentUser._id, ...mutedList] },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 Hari
    };

    // Untuk akun baru: jika konten 7 hari terakhir juga kosong, buka lebih lebar
    const commonMatchWide = {
        userId: { $nin: [currentUser._id, ...mutedList] },
    };

    const aggregationPipeline = [
        {
            $facet: {
                // Interest bucket — skip jika kosong (mencegah $in: [] yang match nothing)
                "interestBucket": sortedInterests.length > 0 ? [
                    { $match: { ...commonMatch, category: { $in: sortedInterests }, likes: { $ne: currentUser._id } }},
                    { $sample: { size: 150 } }
                ] : [],

                // Discovery bucket — turunkan threshold dari >5 ke >0 agar konten baru tetap masuk
                "discoveryBucket": [
                    { $match: { ...commonMatch, category: { $nin: sortedInterests } }},
                    { $sort: { views: -1, createdAt: -1 } }, { $limit: 100 }, { $sample: { size: 50 } }
                ],

                // Following bucket — skip jika followingList kosong (mencegah $in: [])
                "followingBucket": followingList.length > 0 ? [
                    { $match: { ...commonMatch, userId: { $in: followingList } }},
                    { $sort: { createdAt: -1 } }, { $limit: 50 }
                ] : [],

                // ✅ NEW USER BUCKET — fallback untuk akun baru tanpa interest & following
                // Ambil postingan paling populer/terbaru tanpa batasan waktu ketat
                "newUserBucket": isNewUser ? [
                    { $match: commonMatchWide },
                    { $sort: { views: -1, createdAt: -1 } },
                    { $limit: 80 }
                ] : []
            }
        },
        { $project: { candidates: { $concatArrays: ["$interestBucket", "$discoveryBucket", "$followingBucket", "$newUserBucket"] } } },
        { $unwind: "$candidates" },
        { $replaceRoot: { newRoot: "$candidates" } },
        { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } }, // Dedup
        { $replaceRoot: { newRoot: "$doc" } }
    ];

    const rawCandidates = await Post.aggregate(aggregationPipeline);
    await Post.populate(rawCandidates, { path: 'userId', select: 'isVerified username' });

    // C. PRE-PROCESSING (IMPRESSION PENALTY & FRESHNESS)
    const payload = [];
    const validCandidatesMap = new Map();

    for (const post of rawCandidates) {
        const strId = post._id.toString();
        
        // 1. Cek Impression (Seen Count)
        const seenCount = parseInt(impressionMap[strId] || '0');
        
        // [RULE] Kick post yang sudah dilihat >= 3 kali tanpa interaksi
        if (seenCount >= 3) continue;

        // 2. Hitung Penalty Factor
        // Seen 0x: 1.0 (Normal)
        // Seen 1x: 0.8 (Turun dikit)
        // Seen 2x: 0.5 (Turun drastis)
        let penaltyFactor = 1.0;
        if (seenCount === 1) penaltyFactor = 0.8;
        if (seenCount === 2) penaltyFactor = 0.5;

        // 3. Freshness Decay (Exponential)
        // Post baru (0 jam) = 1.0
        // Post 12 jam = 0.6
        // Post 24 jam = 0.36
        const hoursAgo = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        const freshnessScore = Math.exp(-hoursAgo / 24); 

        const isFollowingPost = followingList.some(id => id.toString() === post.userId._id.toString());
        const isInterestPost = sortedInterests.includes(post.category);

        validCandidatesMap.set(strId, post);

        payload.push({
            id: strId,
            likes: post.likes.length,
            reposts: post.reposts.length,
            comments: post.comments,
            has_friend_liked: false,      // TODO: implementasi social proof nanti
            is_following: isFollowingPost, // ✅ FIX: sekarang dikirim ke ranker
            is_interest: isInterestPost,   // ✅ FIX: sekarang dikirim ke ranker
            hours_ago: hoursAgo,           // ✅ FIX: sekarang dikirim ke ranker
            is_verified: post.userId.isVerified,
            // Custom Score Factors untuk Fallback / Post-Process
            _internal: {
                penaltyFactor,
                freshnessScore,
                followingBoost: isFollowingPost ? 1.2 : 1.0,
                authorId: post.userId._id.toString()
            }
        });
    }

    // D. RANKING (AI + LOGIC GABUNGAN)
    let rankedIds = [];
    try {
        const aiResponse = await axios.post(AI_RANKER_URL, { candidates: payload });
        // AI mengembalikan [{ id, score, rec_type }]
        // Kita harus kalikan score AI dengan Penalty & Freshness kita
        
        const adjustedRanking = aiResponse.data.map(item => {
            const meta = payload.find(p => p.id === item.id)?._internal || {};
            
            // FINAL SCORE = AI_SCORE * PENALTY * FRESHNESS * FOLLOWING
            // Ini memastikan post basi/sering dilihat akan tenggelam meski AI suka
            const finalScore = item.score * (meta.penaltyFactor || 1) * (meta.freshnessScore || 0.5) * (meta.followingBoost || 1);
                               
            return { ...item, finalScore };
        });

        // Sort ulang berdasarkan Final Score
        adjustedRanking.sort((a, b) => b.finalScore - a.finalScore);
        rankedIds = adjustedRanking.map(r => r.id);

    } catch (e) {
        // Fallback: Sort manual by freshness & likes
        rankedIds = payload
            .sort((a, b) => (b.likes * b._internal.freshnessScore) - (a.likes * a._internal.freshnessScore))
            .map(p => p.id);
    }

    // E. DIVERSITY GUARD (HARD FILTER) & PAGINATION
    // Kita lakukan filtering diversity SEBELUM pagination agar halaman tidak kosong
    const finalFeedIds = [];
    const authorCounts = {}; // { authorId: count }
    
    // Max post per author per response (Halaman)
    const MAX_POSTS_PER_AUTHOR = 2; 

    for (const id of rankedIds) {
        const post = validCandidatesMap.get(id);
        if (!post) continue;

        const authorId = post.userId._id.toString();
        const currentCount = authorCounts[authorId] || 0;

        // [RULE] Skip jika author ini sudah muncul 2x di feed kali ini
        if (currentCount >= MAX_POSTS_PER_AUTHOR) continue;

        finalFeedIds.push(id);
        authorCounts[authorId] = currentCount + 1;
        
        // Stop jika sudah cukup untuk 1 halaman (plus buffer dikit)
        if (finalFeedIds.length >= (parseInt(limit) * page)) break;
    }

    // Ambil slice untuk halaman ini
    const startIndex = (page - 1) * parseInt(limit);
    const paginatedIds = finalFeedIds.slice(startIndex, startIndex + parseInt(limit));

    // F. HYDRATE & RESPONSE
    const finalPosts = await Post.find({ _id: { $in: paginatedIds } }).populate(feedPopulate);
    
    // Urutkan kembali sesuai urutan ranking (karena find() mongo tidak menjamin urutan)
    const orderedPosts = paginatedIds
        .map(id => finalPosts.find(p => p._id.toString() === id))
        .filter(p => p !== undefined);

    // G. RECORD IMPRESSIONS (ASYNCHRONOUS)
    // Catat bahwa user sudah melihat post-post ini
    if (paginatedIds.length > 0) {
        const pipe = redis.pipeline();
        paginatedIds.forEach(id => {
            pipe.hincrby(impressionKey, id, 1);
        });
        // Set expire impression map jadi 24 jam (reset daily)
        pipe.expire(impressionKey, 86400); 
        await pipe.exec();
    }

    res.json(orderedPosts);

  } catch (err) {
    console.error("Feed Error:", err);
    res.status(500).json({ message: "Feed error" });
  }
};