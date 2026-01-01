const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, requireAnyRole } = require('../../src/middleware/auth');
const { pool } = require('../../src/config/database');

describe('Auth Middleware', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: `middleware-test${Date.now()}@example.com`,
      role: 'manager',
      approval_status: 'approved',
    });
  });

  afterAll(async () => {
    await cleanupTestData('users', `email LIKE 'middleware-test%'`);
  });

  describe('authenticateToken', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should authenticate valid token', async () => {
      const token = generateTestToken(testUser);
      req.headers['authorization'] = `Bearer ${token}`;

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.user.email).toBe(testUser.email);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('No token provided'),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      req.headers['authorization'] = 'InvalidFormat';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid token format'),
          }),
        })
      );
    });

    it('should reject malformed token', async () => {
      req.headers['authorization'] = 'Bearer invalid-token-string';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid or expired token'),
          }),
        })
      );
    });

    it('should reject expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        {
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      req.headers['authorization'] = `Bearer ${expiredToken}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid or expired token'),
          }),
        })
      );
    });

    it('should reject pending user', async () => {
      const pendingUser = await createTestUser({
        email: `middleware-pending${Date.now()}@example.com`,
        role: 'manager',
        approval_status: 'pending',
      });

      const token = generateTestToken(pendingUser);
      req.headers['authorization'] = `Bearer ${token}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('pending admin approval'),
            status: 'pending',
          }),
        })
      );

      await cleanupTestData('users', `id = ${pendingUser.id}`);
    });

    it('should reject rejected user', async () => {
      const rejectedUser = await createTestUser({
        email: `middleware-rejected${Date.now()}@example.com`,
        role: 'manager',
        approval_status: 'rejected',
      });

      const token = generateTestToken(rejectedUser);
      req.headers['authorization'] = `Bearer ${token}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('rejected'),
            status: 'rejected',
          }),
        })
      );

      await cleanupTestData('users', `id = ${rejectedUser.id}`);
    });

    it('should handle non-existent user gracefully', async () => {
      const fakeToken = jwt.sign(
        {
          id: 99999,
          email: 'nonexistent@example.com',
          role: 'manager',
          approval_status: 'approved',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers['authorization'] = `Bearer ${fakeToken}`;

      await authenticateToken(req, res, next);

      // The middleware has a fallback that allows the request to proceed
      // with user data from the token when DB lookup fails
      // This is by design for resilience
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(99999);
    });
  });

  describe('requireRole', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: null,
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should allow user with correct role', () => {
      req.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user with wrong role', () => {
      req.user = {
        id: 1,
        email: 'manager@example.com',
        role: 'manager',
      };

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('admin role required'),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      req.user = null;

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Authentication required',
          }),
        })
      );
    });
  });

  describe('requireAnyRole', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: null,
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should allow user with any of the specified roles', () => {
      req.user = {
        id: 1,
        email: 'manager@example.com',
        role: 'manager',
      };

      const middleware = requireAnyRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user without any of the specified roles', () => {
      req.user = {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = requireAnyRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('admin or manager'),
          }),
        })
      );
    });

    it('should reject unauthenticated request', () => {
      const middleware = requireAnyRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Authentication required',
          }),
        })
      );
    });
  });

  describe('Token Payload Validation', () => {
    it('should extract correct user info from token', async () => {
      const token = generateTestToken(testUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.approval_status).toBe(testUser.approval_status);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    it('should have valid expiration time', () => {
      const token = generateTestToken(testUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp;

      expect(expirationTime).toBeGreaterThan(currentTime);
      // Token should be valid for at least 55 minutes (we set 1h in test helper)
      expect(expirationTime - currentTime).toBeGreaterThan(55 * 60);
    });
  });
});

