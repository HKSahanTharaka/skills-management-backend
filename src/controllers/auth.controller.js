/**
 * Authentication Controller
 *
 * This controller handles user registration and login using JWT authentication.
 *
 * Understanding JWT Authentication:
 * - User sends email/password
 * - Backend verifies credentials
 * - Backend creates JWT token (like a special ticket)
 * - User includes token in future requests
 * - Backend verifies token to identify user
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Register Function
 *
 * Steps:
 * 1. Validate email format
 * 2. Check if email already exists
 * 3. Hash password using bcrypt (never store plain passwords!)
 * 4. Insert user into database
 * 5. Return success message
 *
 * Password Hashing Explained:
 * Plain password: "mypassword123"
 * ↓ (bcrypt hashing)
 * Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMye.IjfO4ZjJZjZ..."
 * Even if someone steals your database, they can't read passwords!
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role = 'user' } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
        },
      });
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
        },
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
        },
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid role. Must be one of: admin, manager, user',
        },
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists',
        },
      });
    }

    // Hash password using bcrypt
    // Salt rounds: 10 (higher = more secure but slower)
    // Never store plain passwords!
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );

    // Return success response (don't include password!)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        email: email,
        role: role,
      },
    });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

/**
 * Login Function
 *
 * Steps:
 * 1. Find user by email
 * 2. Compare provided password with hashed password
 * 3. Generate JWT token if password matches
 * 4. Return token and user info
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
        },
      });
    }

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, email, password, role FROM users WHERE email = ?',
      [email]
    );

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    const user = users[0];

    // Compare provided password with hashed password
    // bcrypt.compare() automatically handles the comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    // Generate JWT token if password matches
    // JWT token contains user info (payload) and is signed with a secret key
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Authentication service is not properly configured'
      });
    }
    
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Token expires in 7 days
      }
    );

    // Return token and user info (don't include password!)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
              p.id as personnel_id, p.name, p.role_title, p.experience_level, 
              p.profile_image_url, p.bio
       FROM users u
       LEFT JOIN personnel p ON u.id = p.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const userData = users[0];

    res.status(200).json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        personnel: userData.personnel_id ? {
          id: userData.personnel_id,
          name: userData.name,
          role_title: userData.role_title,
          experience_level: userData.experience_level,
          profile_image_url: userData.profile_image_url,
          bio: userData.bio,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    const [users] = await pool.execute(
      'SELECT id, email, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const user = users[0];

    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid email format',
          },
        });
      }

      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already exists',
          },
        });
      }

      await pool.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        [email, userId]
      );
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Current password is required to set a new password',
          },
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
          },
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
          },
        });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await pool.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
    }

    const [updatedUsers] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
              p.id as personnel_id, p.name, p.role_title, p.experience_level, 
              p.profile_image_url, p.bio
       FROM users u
       LEFT JOIN personnel p ON u.id = p.user_id
       WHERE u.id = ?`,
      [userId]
    );

    const userData = updatedUsers[0];

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        personnel: userData.personnel_id ? {
          id: userData.personnel_id,
          name: userData.name,
          role_title: userData.role_title,
          experience_level: userData.experience_level,
          profile_image_url: userData.profile_image_url,
          bio: userData.bio,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
};
