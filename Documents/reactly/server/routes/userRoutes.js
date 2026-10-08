const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth'); // Import middleware baru
const multer = require('multer');

// Setup Multer (Upload Gambar)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
router.get('/search', auth, userController.searchUsers);
// Public Routes
router.get('/:username', userController.getUserProfile);
router.get('/:username/posts', userController.getUserPosts);
router.put('/:username/follow', auth, userController.followUser);
router.put('/:username/unfollow', auth, userController.unfollowUser);
router.get('/:username/replies', userController.getUserReplies);
router.get('/:username/media', userController.getUserMedia);
router.get('/:username/likes', userController.getUserLikes);
router.get('/:username/highlights', userController.getUserHighlights);
// Protected Routes (Butuh Login)
// PUT /api/users/profile -> Update profil sendiri
// upload.fields menghandle upload 2 file sekaligus (avatar & cover)
router.put(
  '/profile', 
  auth, 
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), 
  userController.updateUserProfile
);

module.exports = router;