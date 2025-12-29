/**
 * Authentication Middleware
 *
 * Purpose: Protect routes that require authentication
 *
 * How it works:
 * 1. Extract token from request header
 * 2. Verify token using JWT_SECRET
 * 3. If valid, attach user info to request object
 * 4. If invalid, return 401 Unauthorized error
 *
 * Usage: Any route that needs authentication will use this middleware
 * Example: router.get('/protected', authenticateToken, controllerFunction)
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * JWT Authentication Middleware
 *
 * This middleware protects routes by verifying JWT tokens.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Step 1: Extract token from request header
    // Token is sent in Authorization header as: "Bearer <token>"
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
        },
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.split(' ')[1]; // Get token after "Bearer "

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Invalid token format.',
        },
      });
    }

    // Step 2: Verify token using JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      // eslint-disable-next-line no-console
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Server configuration error',
        },
      });
    }

    // Verify the token
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        // Step 4: If invalid, return 401 Unauthorized error
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired token',
          },
        });
      }

      // Step 3: If valid, attach user info to request object
      // Optionally verify user still exists in database
      try {
        const [users] = await pool.execute(
          'SELECT id, email, role, approval_status FROM users WHERE id = ?',
          [decoded.id]
        );

        if (users.length === 0) {
          return res.status(401).json({
            success: false,
            error: {
              message: 'User not found',
            },
          });
        }

        const user = users[0];

        if (user.approval_status !== 'approved') {
          return res.status(403).json({
            success: false,
            error: {
              message: user.approval_status === 'pending' 
                ? 'Your account is pending admin approval'
                : 'Your account has been rejected',
              status: user.approval_status,
            },
          });
        }

        req.user = user;

        next();
      } catch (dbError) {
        // eslint-disable-next-line no-console
        console.error('Database error during authentication:', dbError);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          approval_status: decoded.approval_status,
        };
        next();
      }
    });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

/**
 * Optional: Middleware to check if user has specific role
 *
 * Usage: router.get('/admin', authenticateToken, requireRole('admin'), controllerFunction)
 *
 * @param {string} role - Required role (admin, manager, user)
 * @returns {Function} Middleware function
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. ${role} role required.`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified roles
 *
 * Usage: router.get('/api', authenticateToken, requireAnyRole(['admin', 'manager']), controllerFunction)
 *
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${roles.join(' or ')}.`,
        },
      });
    }

    next();
  };
};

/**
 * Check if current user is admin
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
const isAdmin = (user) => {
  return user && user.role === 'admin';
};

/**
 * Check if current user is manager or admin
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
const isManagerOrAdmin = (user) => {
  return user && (user.role === 'admin' || user.role === 'manager');
};

/**
 * Check if current user can modify resource
 * Users can modify their own resources, managers and admins can modify all
 * @param {Object} user - User object from req.user
 * @param {number} resourceOwnerId - ID of resource owner
 * @returns {boolean}
 */
const canModifyResource = (user, resourceOwnerId) => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'manager') return true;
  return user.id === resourceOwnerId;
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole,
  isAdmin,
  isManagerOrAdmin,
  canModifyResource,
};
