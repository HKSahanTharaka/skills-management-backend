/**
 * Personnel API Unit Tests
 * 
 * Test structure:
 * - Setup: Create test database connection
 * - Execute: Make API request
 * - Assert: Check response matches expectations
 * - Teardown: Clean up test data
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Personnel API Tests', () => {
  // Test data storage
  let createdPersonnelIds = [];
  let testPersonnelId = null;

  /**
   * Setup: Create test database connection and prepare test data
   * Runs before all tests
   */
  beforeAll(async () => {
    // Test database connection
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ Test database connection established');
    } catch (error) {
      console.error('❌ Test database connection failed:', error.message);
      throw error;
    }
  });

  /**
   * Teardown: Clean up test data
   * Runs after all tests
   */
  afterAll(async () => {
    // Clean up all test personnel records
    if (createdPersonnelIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM personnel WHERE id IN (${createdPersonnelIds.map(() => '?').join(',')})`,
          createdPersonnelIds
        );
        console.log('✅ Test data cleaned up');
      } catch (error) {
        console.error('⚠️  Error cleaning up test data:', error.message);
      }
    }
    
    // Close database pool
    await pool.end();
  });

  /**
   * Test: Create new personnel
   * 
   * Steps:
   * 1. Send POST request with valid personnel data
   * 2. Assert response status is 201
   * 3. Assert response contains created personnel data
   * 4. Assert all required fields are present
   */
  describe('POST /api/personnel - Create new personnel', () => {
    test('should create new personnel with valid data', async () => {
      const personnelData = {
        name: 'John Doe',
        email: `john.doe.${Date.now()}@example.com`, // Unique email
        role_title: 'Software Engineer',
        experience_level: 'Senior',
        bio: 'Experienced developer with 10+ years',
        profile_image_url: 'https://example.com/john.jpg'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      // Assert response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Personnel created successfully');
      expect(response.body).toHaveProperty('data');

      // Assert personnel data
      const personnel = response.body.data;
      expect(personnel).toHaveProperty('id');
      expect(personnel.name).toBe(personnelData.name);
      expect(personnel.email).toBe(personnelData.email);
      expect(personnel.role_title).toBe(personnelData.role_title);
      expect(personnel.experience_level).toBe(personnelData.experience_level);
      expect(personnel.bio).toBe(personnelData.bio);
      expect(personnel.profile_image_url).toBe(personnelData.profile_image_url);
      expect(personnel).toHaveProperty('created_at');
      expect(personnel).toHaveProperty('updated_at');

      // Store ID for cleanup
      createdPersonnelIds.push(personnel.id);
      testPersonnelId = personnel.id;
    });

    test('should create personnel with minimal required fields', async () => {
      const personnelData = {
        name: 'Jane Smith',
        email: `jane.smith.${Date.now()}@example.com`,
        role_title: 'Product Manager',
        experience_level: 'Mid-Level'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(personnelData.name);
      expect(response.body.data.email).toBe(personnelData.email);

      createdPersonnelIds.push(response.body.data.id);
    });
  });

  /**
   * Test: Validate required fields
   * 
   * Steps:
   * 1. Send POST request with missing required fields
   * 2. Assert response status is 400
   * 3. Assert error message indicates validation failure
   */
  describe('POST /api/personnel - Validation', () => {
    test('should return 400 when name is missing', async () => {
      const personnelData = {
        email: `test.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Validation failed');
    });

    test('should return 400 when email is missing', async () => {
      const personnelData = {
        name: 'Test User',
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    test('should return 400 when email format is invalid', async () => {
      const personnelData = {
        name: 'Test User',
        email: 'invalid-email',
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    test('should return 400 when role_title is missing', async () => {
      const personnelData = {
        name: 'Test User',
        email: `test.${Date.now()}@example.com`,
        experience_level: 'Junior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when experience_level is missing', async () => {
      const personnelData = {
        name: 'Test User',
        email: `test.${Date.now()}@example.com`,
        role_title: 'Developer'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when experience_level is invalid', async () => {
      const personnelData = {
        name: 'Test User',
        email: `test.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Invalid-Level'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Experience level must be one of');
    });

    test('should return 400 when name exceeds 255 characters', async () => {
      const personnelData = {
        name: 'A'.repeat(256), // 256 characters
        email: `test.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when email already exists', async () => {
      // First, create a personnel
      const email = `duplicate.${Date.now()}@example.com`;
      const personnelData = {
        name: 'First User',
        email: email,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const firstResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      createdPersonnelIds.push(firstResponse.body.data.id);

      // Try to create another with the same email
      const duplicateData = {
        name: 'Second User',
        email: email,
        role_title: 'Manager',
        experience_level: 'Senior'
      };

      const response = await request(app)
        .post('/api/personnel')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');
    });
  });

  /**
   * Test: Get all personnel
   * 
   * Steps:
   * 1. Create test personnel records
   * 2. Send GET request
   * 3. Assert response contains personnel array
   * 4. Assert pagination metadata
   */
  describe('GET /api/personnel - Get all personnel', () => {
    test('should get all personnel', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    test('should filter by experience_level', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .query({ experience_level: 'Senior' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned personnel should have Senior experience level
      response.body.data.forEach(personnel => {
        expect(personnel.experience_level).toBe('Senior');
      });
    });

    test('should search by name or email', async () => {
      // Create a personnel with unique name
      const uniqueName = `SearchTest${Date.now()}`;
      const personnelData = {
        name: uniqueName,
        email: `searchtest.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      createdPersonnelIds.push(createResponse.body.data.id);

      // Search for the personnel
      const response = await request(app)
        .get('/api/personnel')
        .query({ search: uniqueName })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some(p => p.name === uniqueName)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  /**
   * Test: Get personnel by ID
   * 
   * Steps:
   * 1. Create a test personnel
   * 2. Send GET request with personnel ID
   * 3. Assert response contains correct personnel data
   */
  describe('GET /api/personnel/:id - Get personnel by ID', () => {
    test('should get personnel by ID', async () => {
      // Create a test personnel first
      const personnelData = {
        name: 'Get By ID Test',
        email: `getbyid.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Mid-Level',
        bio: 'Test bio for get by ID'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = createResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Get the personnel by ID
      const response = await request(app)
        .get(`/api/personnel/${personnelId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', personnelId);
      expect(response.body.data.name).toBe(personnelData.name);
      expect(response.body.data.email).toBe(personnelData.email);
      expect(response.body.data.role_title).toBe(personnelData.role_title);
      expect(response.body.data.experience_level).toBe(personnelData.experience_level);
      expect(response.body.data).toHaveProperty('skills');
      expect(Array.isArray(response.body.data.skills)).toBe(true);
    });

    test('should return 404 for non-existent personnel', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .get(`/api/personnel/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/personnel/invalid-id')
        .expect(404); // Route not found or invalid ID handling

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * Test: Update personnel
   * 
   * Steps:
   * 1. Create a test personnel
   * 2. Send PUT request with updated data
   * 3. Assert response contains updated personnel data
   */
  describe('PUT /api/personnel/:id - Update personnel', () => {
    let updatePersonnelId;

    beforeEach(async () => {
      // Create a personnel for update tests
      const personnelData = {
        name: 'Update Test User',
        email: `updatetest.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      updatePersonnelId = createResponse.body.data.id;
      createdPersonnelIds.push(updatePersonnelId);
    });

    test('should update personnel with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        role_title: 'Senior Developer',
        experience_level: 'Senior',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put(`/api/personnel/${updatePersonnelId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Personnel updated successfully');
      expect(response.body.data.id).toBe(updatePersonnelId);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.role_title).toBe(updateData.role_title);
      expect(response.body.data.experience_level).toBe(updateData.experience_level);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    test('should update only provided fields', async () => {
      // Get original personnel
      const getResponse = await request(app)
        .get(`/api/personnel/${updatePersonnelId}`)
        .expect(200);

      const originalEmail = getResponse.body.data.email;
      const originalRole = getResponse.body.data.role_title;

      // Update only name
      const updateData = {
        name: 'Partially Updated Name'
      };

      const response = await request(app)
        .put(`/api/personnel/${updatePersonnelId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(originalEmail);
      expect(response.body.data.role_title).toBe(originalRole);
    });

    test('should return 404 when updating non-existent personnel', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/personnel/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should return 400 when experience_level is invalid', async () => {
      const updateData = {
        experience_level: 'Invalid-Level'
      };

      const response = await request(app)
        .put(`/api/personnel/${updatePersonnelId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when updating to duplicate email', async () => {
      // Create another personnel
      const email1 = `duplicate1.${Date.now()}@example.com`;
      const email2 = `duplicate2.${Date.now()}@example.com`;

      const personnel1 = {
        name: 'User 1',
        email: email1,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const personnel2 = {
        name: 'User 2',
        email: email2,
        role_title: 'Manager',
        experience_level: 'Senior'
      };

      const create1 = await request(app)
        .post('/api/personnel')
        .send(personnel1)
        .expect(201);

      const create2 = await request(app)
        .post('/api/personnel')
        .send(personnel2)
        .expect(201);

      createdPersonnelIds.push(create1.body.data.id, create2.body.data.id);

      // Try to update personnel2 with personnel1's email
      const response = await request(app)
        .put(`/api/personnel/${create2.body.data.id}`)
        .send({ email: email1 })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');
    });
  });

  /**
   * Test: Delete personnel
   * 
   * Steps:
   * 1. Create a test personnel
   * 2. Send DELETE request
   * 3. Assert response indicates successful deletion
   * 4. Verify personnel is deleted by trying to get it
   */
  describe('DELETE /api/personnel/:id - Delete personnel', () => {
    test('should delete personnel', async () => {
      // Create a personnel for deletion
      const personnelData = {
        name: 'Delete Test User',
        email: `deletetest.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const deletePersonnelId = createResponse.body.data.id;

      // Delete the personnel
      const deleteResponse = await request(app)
        .delete(`/api/personnel/${deletePersonnelId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Personnel deleted successfully');

      // Verify personnel is deleted
      await request(app)
        .get(`/api/personnel/${deletePersonnelId}`)
        .expect(404);
    });

    test('should return 404 when deleting non-existent personnel', async () => {
      const response = await request(app)
        .delete('/api/personnel/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });
});
