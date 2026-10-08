const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  author: { type: String, required: true },
  handle: { type: String, required: true },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  content: { type: String, required: false },
  
  // [UPDATE] Support Multi Image
  image: { type: String }, 
  images: { type: [String], default: [] }, 
  video: { type: String, default: null }, 
  
  // [BARU] Field Polling
  poll: {
    question: { type: String },
    options: [{
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
    }],
    expiresAt: { type: Date } 
  },

  gifUrl: { type: String, default: null },
  
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Quote Postingan lain
  quoteOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  
  // [BARU] Quote Komentar 
  quoteCommentOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  
  pinned: {
    type: Boolean,
    default: false
  },

  views: { type: Number, default: 0 },
  category: { type: String, default: "Uncategorized", index: true },
  comments: { type: Number, default: 0 }
  
}, { timestamps: true });

// ==========================================================
// [FIX ERROR 291 & OPTIMISASI]
// ==========================================================

PostSchema.index({ content: 'text', author: 'text', handle: 'text' });
PostSchema.index({ userId: 1 }); // Helper untuk relasi

module.exports = mongoose.model('Post', PostSchema);