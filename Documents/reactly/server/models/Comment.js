const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  replyCount: { type: Number, default: 0 },

  author: { type: String, required: true },
  handle: { type: String, required: true },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },

 content: { type: String, default: "" }, // Ubah required jadi false (jika cuma kirim gambar)
  image: { type: String, default: null }, // [BARU] Field gambar
  
  // [BARU] Tambahkan fitur interaksi
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);