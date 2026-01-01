const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Authentication API', () => {
  let testUser;

  afterEach(async () => {
    // Clean up test users
    if (testUser) {
      await cleanupTestData('users', `email LIKE 'authtest%'`);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new manager successfully', async () => {
      const userData = {
        email: `authtest${Date.now()}@example.com`,
        password: 'password123',
        role: 'manager',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe('manager');
      expect(response.body.user.approval_status).toBe('pending');
      expect(response.body.message).toContain('pending admin approval');

      testUser = response.body.user;
    });

    it('should register a new admin successfully with approved status', async () => {
      const userData = {
        email: `authtest${Date.now()}@example.com`,
        password: 'password123',
        role: 'admin',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.approval_status).toBe('approved');

      testUser = response.body.user;
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
          role: 'manager',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email and password are required');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: 'manager',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email format');
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `authtest${Date.now()}@example.com`,
          password: '12345',
          role: 'manager',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('at least 6 characters');
    });

    it('should fail with duplicate email', async () => {
      const email = `authtest${Date.now()}@example.com`;

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          role: 'manager',
        })
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password456',
          role: 'manager',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');

      testUser = { email };
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `authtest${Date.now()}@example.com`,
          password: 'password123',
          role: 'superuser',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid role');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create an approved user for login tests
      testUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
        approval_status: 'approved',
        role: 'manager',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('manager');
      expect(response.body.message).toBe('Login successful');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should fail for pending approval status', async () => {
      // Create a pending user
      const pendingUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
        approval_status: 'pending',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: pendingUser.email,
          password: 'password123',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('pending admin approval');
      expect(response.body.error.status).toBe('pending');

      await cleanupTestData('users', `id = ${pendingUser.id}`);
    });

    it('should fail for rejected approval status', async () => {
      // Create a rejected user
      const rejectedUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
        approval_status: 'rejected',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: rejectedUser.email,
          password: 'password123',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('rejected');
      expect(response.body.error.status).toBe('rejected');

      await cleanupTestData('users', `id = ${rejectedUser.id}`);
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
        approval_status: 'approved',
      });
      token = generateTestToken(testUser);
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.role).toBe(testUser.role);
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired token');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
        approval_status: 'approved',
      });
      token = generateTestToken(testUser);
    });

    it('should update email successfully', async () => {
      const newEmail = `authtest${Date.now()}@example.com`;

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newEmail);
      expect(response.body.message).toContain('Profile updated successfully');
    });

    it('should update password successfully', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail to update password with wrong current password', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Current password is incorrect');
    });

    it('should fail to update to duplicate email', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: `authtest${Date.now()}@example.com`,
      });

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: otherUser.email })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');

      await cleanupTestData('users', `id = ${otherUser.id}`);
    });
  });
});

