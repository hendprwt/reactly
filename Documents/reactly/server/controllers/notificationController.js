const Notification = require('../models/Notification');

// 1. Ambil Notifikasi
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      // Populate User Utama (Pelaku terakhir)
      .populate('sender', 'username fullName avatar isVerified followers') 
      
      // [PENTING] Populate Array Senders untuk Grouping (Vote/Like)
      // Tanpa ini, frontend tidak bisa menampilkan "and 2 others" dengan benar
      .populate('senders', 'username fullName avatar isVerified') 

      // Populate Konten
      .populate('postId', 'content')
      .populate('commentId', 'content')
      
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Tandai Baca
exports.markRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "All read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Hapus Semua (Clear All)
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: "Notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Hapus Spesifik (Batch Delete untuk Group Swipe)
exports.deleteNotificationsBatch = async (req, res) => {
  try {
    const { ids } = req.body; // Array ID notifikasi dari frontend
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid IDs" });
    }

    await Notification.deleteMany({ 
        _id: { $in: ids },
        recipient: req.user.id 
    });
    
    res.json({ message: "Selected notifications deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};