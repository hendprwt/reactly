const express = require('express');
const router = express.Router();
// [FIX] Hapus kurung kurawal { } karena auth.js export-nya langsung function
const auth = require('../middleware/auth'); 
const notificationController = require('../controllers/notificationController');

// Pastikan controller-nya tidak undefined
if (!notificationController.getNotifications || !notificationController.markRead) {
  console.error("Error: Fungsi controller notifikasi tidak ditemukan. Cek file notificationController.js");
}

router.get('/', auth, notificationController.getNotifications);
router.put('/read', auth, notificationController.markRead);
router.delete('/', auth, notificationController.deleteAllNotifications);

// [BARU] Route Delete Batch (Pakai POST agar bisa kirim body array ID)
router.post('/delete', auth, notificationController.deleteNotificationsBatch);
module.exports = router;