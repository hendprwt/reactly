const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// === KONFIGURASI MULTER ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// === ROUTES ===

// 1. Route Global / List
router.get('/', postController.getAllPosts);

// [PENTING] Import Controller Feed
const feedController = require('../controllers/feedController');

// Feed Routes (harus sebelum /:id)
router.get('/feed/following', auth, feedController.getFollowingFeed);
router.get('/feed/foryou', auth, feedController.getForYouFeed);

// Trending
router.get('/trending', postController.getRealtimeTrending);

// Create Post
router.post('/', auth, upload.fields([
  { name: 'images', maxCount: 4 },
  { name: 'video', maxCount: 1 }
]), postController.createPost);

// Post Interactions
router.put('/:id/like', auth, postController.likePost);
router.put('/:id/repost', auth, postController.repostPost);
router.put('/:id/bookmark', auth, postController.bookmarkPost);
router.put('/:id/vote', auth, postController.votePost);
router.put('/:id/pin', auth, postController.togglePin);
router.delete('/:id', auth, postController.deletePost);
router.get('/:id/activity', postController.getPostActivity);

// Post Detail — paling bawah agar tidak menimpa route statis
router.get('/:id', postController.getPostDetail);

// Comments & Comment Interactions
router.post('/:id/comment', auth, upload.single('image'), postController.addComment);
router.put('/comments/:id/like', auth, postController.likeComment);
router.put('/comments/:id/repost', auth, postController.repostComment);
router.get('/comments/:id', postController.getCommentDetail);

// ✅ DEBUG ROUTE DIHAPUS — jangan expose data Redis ke public
// Gunakan Redis CLI atau admin panel untuk debug interest data

module.exports = router;