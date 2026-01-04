const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const register = async (req, res, next) => {
  try {
    const { email, password, role = 'manager' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
        },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
        },
      });
    }

    const validRoles = ['admin', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid role. Must be one of: admin, manager',
        },
      });
    }

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

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const approvalStatus = role === 'admin' ? 'approved' : 'pending';

    const [result] = await pool.execute(
      'INSERT INTO users (email, password, role, approval_status) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, approvalStatus]
    );

    const message =
      role === 'manager'
        ? 'Registration successful. Your account is pending admin approval.'
        : 'User registered successfully';

    res.status(201).json({
      success: true,
      message: message,
      user: {
        id: result.insertId,
        email: email,
        role: role,
        approval_status: approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
        },
      });
    }

    const [users] = await pool.execute(
      'SELECT id, email, password, role, approval_status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    const user = users[0];

    if (user.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your account is pending admin approval',
          status: 'pending',
        },
      });
    }

    if (user.approval_status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: {
          message:
            'Your account has been rejected. Please contact the administrator',
          status: 'rejected',
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      // eslint-disable-next-line no-console
      console.error('JWT_SECRET is not configured in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Authentication service is not properly configured',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.approval_status, u.profile_image_url, u.created_at, u.updated_at,
              p.id as personnel_id, p.name, p.role_title, p.experience_level, 
              p.profile_image_url as personnel_profile_image_url, p.bio
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
        approval_status: userData.approval_status,
        profile_image_url: userData.profile_image_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        personnel: userData.personnel_id
          ? {
              id: userData.personnel_id,
              name: userData.name,
              role_title: userData.role_title,
              experience_level: userData.experience_level,
              profile_image_url: userData.personnel_profile_image_url,
              bio: userData.bio,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, currentPassword, newPassword, profile_image_url } = req.body;

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

      await pool.execute('UPDATE users SET email = ? WHERE id = ?', [
        email,
        userId,
      ]);
    }

    if (profile_image_url !== undefined) {
      await pool.execute(
        'UPDATE users SET profile_image_url = ? WHERE id = ?',
        [profile_image_url || null, userId]
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

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

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

      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [
        hashedPassword,
        userId,
      ]);
    }

    const [updatedUsers] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.approval_status, u.profile_image_url, u.created_at, u.updated_at,
              p.id as personnel_id, p.name, p.role_title, p.experience_level, 
              p.profile_image_url as personnel_profile_image_url, p.bio
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
        approval_status: userData.approval_status,
        profile_image_url: userData.profile_image_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        personnel: userData.personnel_id
          ? {
              id: userData.personnel_id,
              name: userData.name,
              role_title: userData.role_title,
              experience_level: userData.experience_level,
              profile_image_url: userData.personnel_profile_image_url,
              bio: userData.bio,
            }
          : null,
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
