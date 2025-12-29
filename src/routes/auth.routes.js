/**
 * Authentication Routes
 *
 * These routes handle user registration and login
 */

const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, updateProfile } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login user and receive JWT token
router.post('/login', login);

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, getCurrentUser);

// PUT /api/auth/me - Update current user profile
router.put('/me', authenticateToken, updateProfile);

module.exports = router;
