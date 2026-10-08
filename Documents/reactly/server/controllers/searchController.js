const User = require('../models/User');
const Post = require('../models/Post');

exports.searchAll = async (req, res) => {
  try {
    // 1. Ambil Parameter Pagination
    const { q, tab = 'all', page = 1, limit = 10 } = req.query;
    
    // Jika tidak ada query, kembalikan array kosong
    if (!q) return res.json({ posts: [], users: [], hashtags: [] });

    // Konversi ke Integer & Hitung Skip
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // === 1. CARI USER UNTUK DITAMPILKAN (Hanya di Page 1) ===
    // Kita hanya kirim list user (profil) di halaman pertama.
    // Saat scroll (page 2+), user biasanya cari konten/postingan.
    let matchedUsers = [];
    if (pageInt === 1) {
        matchedUsers = await User.find(
          { $text: { $search: q } }, 
          { score: { $meta: "textScore" } } 
        )
        .sort({ score: { $meta: "textScore" } })
        .select('_id username fullName avatar isVerified followers');
    }

    // === 2. CARI ID USER UNTUK FILTER POST (Di Semua Page) ===
    // Walaupun kita tidak kirim profil user di page 2, kita tetap butuh ID-nya
    // supaya kita bisa cari "Postingan oleh Hendrik" di halaman berapapun.
    // Query ini ringan karena cuma ambil _id.
    const userIdsForPost = await User.find({ $text: { $search: q } }).select('_id');
    const matchedUserIds = userIdsForPost.map(u => u._id);

    // === 3. SIAPKAN QUERY POSTINGAN ===
    const postQuery = {
      $or: [
        { $text: { $search: q } },          // Match Content
        { userId: { $in: matchedUserIds } } // Match Author
      ]
    };

    // Konfigurasi Deep Populate
    const deepPopulate = [
      { path: 'userId', select: 'username fullName avatar isVerified' },
      { path: 'quoteOf', populate: { path: 'userId', select: 'username fullName avatar isVerified' } },
      { path: 'quoteCommentOf', populate: { path: 'userId', select: 'username fullName avatar isVerified' } }
    ];

    let posts = [];

    // === 4. EKSEKUSI QUERY POST (DENGAN PAGINATION) ===
    if (tab !== 'users') {
      if (tab === 'populer') {
        // --- LOGIC POPULER (Aggregation) ---
        posts = await Post.aggregate([
          { $match: postQuery },
          {
            $addFields: {
              popScore: {
                $add: [
                  { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 2] },
                  { $multiply: [{ $size: { $ifNull: ["$reposts", []] } }, 3] },
                  { $ifNull: ["$views", 0] }
                ]
              }
            }
          },
          { $sort: { popScore: -1 } },
          { $skip: skip },       // [FIX] Lewati data yang sudah diambil
          { $limit: limitInt }   // [FIX] Ambil sesuai limit
        ]);

        posts = await Post.populate(posts, deepPopulate);

      } else {
        // --- LOGIC STANDARD (Top/Terbaru) ---
        let sortOptions = { createdAt: -1 };
        
        // Jika tab 'all' (Top), kita prioritaskan views, lalu tanggal
        if (tab !== 'terbaru') {
             sortOptions = { views: -1, createdAt: -1 };
        }

        posts = await Post.find(postQuery)
          .populate(deepPopulate)
          .sort(sortOptions)
          .skip(skip)        // [FIX] Lewati data yang sudah diambil
          .limit(limitInt);  // [FIX] Ambil sesuai limit
      }
    }

    // === 5. HASHTAGS (Hanya Page 1) ===
    // Ekstrak hashtag cuma perlu di load awal saja biar ringan
    let hashtags = [];
    if (pageInt === 1) {
       hashtags = [...new Set(
         posts.flatMap(p => (p.content && typeof p.content === 'string') ? p.content.match(/#\w+/g) || [] : [])
       )].filter(tag => tag.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
    }

    // === 6. KIRIM RESPONSE ===
    res.json({ 
      users: matchedUsers, 
      posts,               
      hashtags 
    });

  } catch (err) {
    console.error("Search Logic Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// === SUGESTI AUTOCOMPLETE (Tetap Sama) ===
exports.getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ users: [], keywords: [] });

    const regex = new RegExp(q, 'i');

    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }]
    })
    .select('username fullName avatar isVerified')
    .limit(5);

    const keywords = [
       { text: q, type: 'current' } 
    ];

    res.json({ users, keywords });
  } catch (err) {
    console.error("Suggestion Error:", err);
    res.status(500).json({ message: "Error" });
  }
};