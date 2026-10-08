const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Pelaku Terakhir (untuk ditampilkan avatarnya)
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // [BARU] Array untuk menyimpan semua pelaku (Grouping)
  // Contoh: [UserA, UserB, UserC] -> "UserC and 2 others voted"
  senders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 

  type: { 
    type: String, 
    // [UPDATE] Tambahkan 'vote' ke dalam list enum
    enum: ['like', 'repost', 'reply', 'quote', 'follow', 'vote'], 
    required: true 
  },
  
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, 
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);