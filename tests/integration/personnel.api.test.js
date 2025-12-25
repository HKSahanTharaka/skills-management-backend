/**
 * Personnel API Integration Tests
 * 
 * Test all personnel endpoints with actual database connection.
 * These tests verify the complete API flow from request to response.
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Personnel API', () => {
  // Test data storage for cleanup
  let createdPersonnelIds = [];
  let createdSkillIds = [];
  let createdAssignmentIds = [];

  beforeAll(async () => {
    // Setup: Connect to test database
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Test database connection established');
    } catch (error) {
      console.error('Test database connection failed:', error.message);
      throw error;
    }
  });

  beforeEach(async () => {
    // Clean up: Clear test data before each test
    // Note: In a real scenario, you might want to use transactions
    // For now, we'll clean up in afterAll
  });

  afterAll(async () => {
    // Teardown: Close database connection and clean up test data
    
    // Clean up skill assignments
    if (createdAssignmentIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM personnel_skills WHERE id IN (${createdAssignmentIds.map(() => '?').join(',')})`,
          createdAssignmentIds
        );
      } catch (error) {
        console.error('Error cleaning up skill assignments:', error.message);
      }
    }

    // Clean up personnel
    if (createdPersonnelIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM personnel WHERE id IN (${createdPersonnelIds.map(() => '?').join(',')})`,
          createdPersonnelIds
        );
        console.log('Test personnel data cleaned up');
      } catch (error) {
        console.error('Error cleaning up personnel:', error.message);
      }
    }

    // Clean up skills
    if (createdSkillIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM skills WHERE id IN (${createdSkillIds.map(() => '?').join(',')})`,
          createdSkillIds
        );
      } catch (error) {
        console.error('Error cleaning up skills:', error.message);
      }
    }

    // Close database pool
    await pool.end();
  });

  describe('POST /api/personnel - Create personnel', () => {
    test('should create new personnel with valid data', async () => {
      // Arrange: Set up test data
      const personnelData = {
        name: 'John Doe',
        email: `john.doe.${Date.now()}@example.com`,
        role_title: 'Software Engineer',
        experience_level: 'Senior',
        bio: 'Experienced developer',
        profile_image_url: 'https://example.com/image.jpg'
      };

      // Act: Execute the endpoint
      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      // Assert: Check the result
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Personnel created successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(personnelData.name);
      expect(response.body.data.email).toBe(personnelData.email);
      expect(response.body.data.role_title).toBe(personnelData.role_title);
      expect(response.body.data.experience_level).toBe(personnelData.experience_level);

      // Store ID for cleanup
      createdPersonnelIds.push(response.body.data.id);
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange
      const personnelData = {
        name: 'John Doe'
        // Missing email, role_title, experience_level
      };

      // Act
      const response = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    test('should return 409 when email already exists', async () => {
      // Arrange
      const email = `duplicate.${Date.now()}@example.com`;
      const personnelData = {
        name: 'First User',
        email: email,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      // Create first personnel
      const firstResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      createdPersonnelIds.push(firstResponse.body.data.id);

      // Act: Try to create duplicate
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

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');
    });
  });

  describe('GET /api/personnel - Get all personnel', () => {
    test('should get all personnel with pagination', async () => {
      // Arrange: Create test personnel
      const personnelData = {
        name: `Test User ${Date.now()}`,
        email: `test.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      createdPersonnelIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/personnel')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    test('should filter by experience_level', async () => {
      // Arrange
      const personnelData = {
        name: `Senior Dev ${Date.now()}`,
        email: `senior.${Date.now()}@example.com`,
        role_title: 'Senior Developer',
        experience_level: 'Senior'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      createdPersonnelIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/personnel')
        .query({ experience_level: 'Senior' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(personnel => {
          expect(personnel.experience_level).toBe('Senior');
        });
      }
    });

    test('should search by name or email', async () => {
      // Arrange
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

      // Act
      const response = await request(app)
        .get('/api/personnel')
        .query({ search: uniqueName })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(p => p.name === uniqueName)).toBe(true);
    });
  });

  describe('GET /api/personnel/:id - Get personnel by ID', () => {
    test('should get personnel by ID with skills', async () => {
      // Arrange
      const personnelData = {
        name: 'Get By ID Test',
        email: `getbyid.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Mid-Level'
      };

      const createResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = createResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Act
      const response = await request(app)
        .get(`/api/personnel/${personnelId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', personnelId);
      expect(response.body.data.name).toBe(personnelData.name);
      expect(response.body.data).toHaveProperty('skills');
      expect(Array.isArray(response.body.data.skills)).toBe(true);
    });

    test('should return 404 for non-existent personnel', async () => {
      // Act
      const response = await request(app)
        .get('/api/personnel/99999')
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('PUT /api/personnel/:id - Update personnel', () => {
    test('should update personnel with valid data', async () => {
      // Arrange
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

      const personnelId = createResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      const updateData = {
        name: 'Updated Name',
        role_title: 'Senior Developer',
        experience_level: 'Senior'
      };

      // Act
      const response = await request(app)
        .put(`/api/personnel/${personnelId}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Personnel updated successfully');
      expect(response.body.data.id).toBe(personnelId);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.role_title).toBe(updateData.role_title);
      expect(response.body.data.experience_level).toBe(updateData.experience_level);
    });

    test('should return 404 when updating non-existent personnel', async () => {
      // Act
      const response = await request(app)
        .put('/api/personnel/99999')
        .send({ name: 'Updated Name' })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('DELETE /api/personnel/:id - Delete personnel', () => {
    test('should delete personnel successfully', async () => {
      // Arrange
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

      const personnelId = createResponse.body.data.id;

      // Act
      const deleteResponse = await request(app)
        .delete(`/api/personnel/${personnelId}`)
        .expect(200);

      // Assert
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Personnel deleted successfully');

      // Verify personnel is deleted
      await request(app)
        .get(`/api/personnel/${personnelId}`)
        .expect(404);
    });
  });

  describe('POST /api/personnel/:id/skills - Assign skill to personnel', () => {
    test('should assign skill to personnel successfully', async () => {
      // Arrange: Create personnel
      const personnelData = {
        name: 'Skill Test User',
        email: `skilltest.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Create skill
      const skillData = {
        skill_name: `Test Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      // Act: Assign skill
      const assignData = {
        skill_id: skillId,
        proficiency_level: 'Advanced',
        years_of_experience: 5
      };

      const response = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send(assignData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Skill assigned to personnel successfully');
      expect(response.body.data).toHaveProperty('personnel_id', personnelId);
      expect(response.body.data).toHaveProperty('skill_id', skillId);
      expect(response.body.data.proficiency_level).toBe('Advanced');

      createdAssignmentIds.push(response.body.data.id);
    });

    test('should return 404 when personnel not found', async () => {
      // Act
      const response = await request(app)
        .post('/api/personnel/99999/skills')
        .send({
          skill_id: 1,
          proficiency_level: 'Advanced'
        })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/personnel/:id/skills - Get personnel skills', () => {
    test('should get all skills for personnel', async () => {
      // Arrange: Create personnel and assign skill
      const personnelData = {
        name: 'Get Skills Test',
        email: `getskills.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Create and assign skill
      const skillData = {
        skill_name: `Get Skills Test Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skillId,
          proficiency_level: 'Intermediate'
        })
        .expect(201);

      // Act
      const response = await request(app)
        .get(`/api/personnel/${personnelId}/skills`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('personnel_id', personnelId);
      expect(response.body).toHaveProperty('skills');
      expect(Array.isArray(response.body.skills)).toBe(true);
      expect(response.body.skills.length).toBeGreaterThan(0);
    });
  });
});

