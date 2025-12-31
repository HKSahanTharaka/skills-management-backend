const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage } = require('../controllers/upload.controller');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for memory storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

router.post('/', authenticateToken, upload.single('image'), uploadImage);

module.exports = router;
