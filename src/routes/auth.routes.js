/**
 * Authentication Routes
 *
 * These routes handle user registration and login
 */

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login user and receive JWT token
router.post('/login', login);

module.exports = router;
