const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Invalid token format.',
        },
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Server configuration error',
        },
      });
    }

    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired token',
          },
        });
      }

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

const isAdmin = (user) => {
  return user && user.role === 'admin';
};

const isManagerOrAdmin = (user) => {
  return user && (user.role === 'admin' || user.role === 'manager');
};

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
