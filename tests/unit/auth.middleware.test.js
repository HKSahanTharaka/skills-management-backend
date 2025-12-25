/**
 * Authentication Middleware Unit Tests
 *
 * Tests the authentication middleware functions with mocked dependencies.
 * Focuses on business logic without hitting the actual database or JWT service.
 */

const { authenticateToken, requireRole } = require('../../src/middleware/auth');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn(),
  },
}));

const jwt = require('jsonwebtoken');
const { pool } = require('../../src/config/database');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();

    // Setup mock request object
    mockReq = {
      headers: {},
      user: null,
    };

    // Setup mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();

    // Set default JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
  });

  describe('authenticateToken', () => {
    describe('Token extraction and validation', () => {
      test('should return 401 when no authorization header is provided', async () => {
        // Arrange
        mockReq.headers = {};

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Access denied. No token provided.',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      test('should return 401 when authorization header is empty', async () => {
        // Arrange
        mockReq.headers = { authorization: '' };

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Access denied. No token provided.',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      test('should return 401 when authorization header does not have Bearer prefix', async () => {
        // Arrange
        mockReq.headers = { authorization: 'InvalidTokenFormat' };

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Access denied. Invalid token format.',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      test('should return 401 when Bearer is present but token is missing', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer' };

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Access denied. Invalid token format.',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      test('should return 500 when JWT_SECRET is not set', async () => {
        // Arrange
        delete process.env.JWT_SECRET;
        mockReq.headers = { authorization: 'Bearer valid-token' };

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Server configuration error',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
      });
    });

    describe('Token verification', () => {
      test('should return 401 when token is invalid', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer invalid-token' };
        jwt.verify.mockImplementation((token, secret, callback) => {
          callback(new Error('Invalid token'), null);
        });

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(jwt.verify).toHaveBeenCalledWith(
          'invalid-token',
          'test-secret-key',
          expect.any(Function)
        );
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Invalid or expired token',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(pool.execute).not.toHaveBeenCalled();
      });

      test('should return 401 when token is expired', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer expired-token' };
        const expiredError = new Error('Token expired');
        expiredError.name = 'TokenExpiredError';
        jwt.verify.mockImplementation((token, secret, callback) => {
          callback(expiredError, null);
        });

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Invalid or expired token',
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('User verification in database', () => {
      test('should attach user to request when token is valid and user exists', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = {
          id: 1,
          email: 'user@example.com',
          role: 'admin',
        };
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          role: 'admin',
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
          callback(null, decodedToken);
        });
        pool.execute.mockResolvedValueOnce([[mockUser]]);

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(jwt.verify).toHaveBeenCalledWith(
          'valid-token',
          'test-secret-key',
          expect.any(Function)
        );
        expect(pool.execute).toHaveBeenCalledWith(
          'SELECT id, email, role FROM users WHERE id = ?',
          [1]
        );
        expect(mockReq.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      test('should return 401 when token is valid but user does not exist in database', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = {
          id: 999,
          email: 'nonexistent@example.com',
          role: 'user',
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
          callback(null, decodedToken);
        });
        pool.execute.mockResolvedValueOnce([[]]); // No user found

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(pool.execute).toHaveBeenCalledWith(
          'SELECT id, email, role FROM users WHERE id = ?',
          [999]
        );
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'User not found',
          },
        });
        // User should not be set (remains null, not undefined)
        expect(mockReq.user).toBeNull();
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should use decoded token info when database lookup fails', async () => {
        // Arrange
        mockReq.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = {
          id: 1,
          email: 'user@example.com',
          role: 'admin',
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
          callback(null, decodedToken);
        });
        const dbError = new Error('Database connection failed');
        pool.execute.mockRejectedValueOnce(dbError);

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(pool.execute).toHaveBeenCalled();
        // Should fallback to using decoded token info
        expect(mockReq.user).toEqual({
          id: decodedToken.id,
          email: decodedToken.email,
          role: decodedToken.role,
        });
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      test('should call next with error when an unexpected error occurs in try block', async () => {
        // Arrange
        const unexpectedError = new Error('Unexpected error');
        // Create a mock request object that will throw when accessing headers
        mockReq = {
          get headers() {
            throw unexpectedError;
          },
        };

        // Act
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(unexpectedError);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireRole', () => {
    test('should call next when user has required role', () => {
      // Arrange
      mockReq.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const middleware = requireRole('admin');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should return 401 when user is not authenticated', () => {
      // Arrange
      mockReq.user = null;
      const middleware = requireRole('admin');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 when user does not have required role', () => {
      // Arrange
      mockReq.user = {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      };
      const middleware = requireRole('admin');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. admin role required.',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 when user role does not match manager role requirement', () => {
      // Arrange
      mockReq.user = {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      };
      const middleware = requireRole('manager');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. manager role required.',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should work with different role types', () => {
      // Arrange
      const testCases = [
        { userRole: 'manager', requiredRole: 'manager', shouldPass: true },
        { userRole: 'admin', requiredRole: 'manager', shouldPass: false },
        { userRole: 'user', requiredRole: 'user', shouldPass: true },
        { userRole: 'admin', requiredRole: 'user', shouldPass: false },
      ];

      testCases.forEach(({ userRole, requiredRole, shouldPass }) => {
        // Reset mocks
        jest.clearAllMocks();

        mockReq.user = {
          id: 1,
          email: `${userRole}@example.com`,
          role: userRole,
        };
        const middleware = requireRole(requiredRole);

        // Act
        middleware(mockReq, mockRes, mockNext);

        // Assert
        if (shouldPass) {
          expect(mockNext).toHaveBeenCalled();
          expect(mockRes.status).not.toHaveBeenCalled();
        } else {
          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockNext).not.toHaveBeenCalled();
        }
      });
    });
  });
});

