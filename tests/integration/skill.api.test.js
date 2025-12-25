/**
 * Skill API Integration Tests
 * 
 * Test all skill endpoints with actual database connection.
 * These tests verify the complete API flow from request to response.
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Skill API', () => {
  // Test data storage for cleanup
  let createdSkillIds = [];
  let createdPersonnelIds = [];
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
        console.log('Test skill data cleaned up');
      } catch (error) {
        console.error('Error cleaning up skills:', error.message);
      }
    }

    // Close database pool
    await pool.end();
  });

  describe('POST /api/skills - Create skill', () => {
    test('should create new skill with valid data', async () => {
      // Arrange: Set up test data
      const skillData = {
        skill_name: `JavaScript ${Date.now()}`,
        category: 'Programming Language',
        description: 'A high-level programming language'
      };

      // Act: Execute the endpoint
      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      // Assert: Check the result
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Skill created successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.skill_name).toBe(skillData.skill_name);
      expect(response.body.data.category).toBe(skillData.category);
      expect(response.body.data.description).toBe(skillData.description);

      // Store ID for cleanup
      createdSkillIds.push(response.body.data.id);
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange
      const skillData = {
        skill_name: 'JavaScript'
        // Missing category
      };

      // Act
      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should return 400 when category is invalid', async () => {
      // Arrange
      const skillData = {
        skill_name: `Test Skill ${Date.now()}`,
        category: 'Invalid Category'
      };

      // Act
      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid category');
    });

    test('should return 409 when skill name already exists', async () => {
      // Arrange
      const skillName = `Duplicate Skill ${Date.now()}`;
      const skillData = {
        skill_name: skillName,
        category: 'Programming Language'
      };

      // Create first skill
      const firstResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      createdSkillIds.push(firstResponse.body.data.id);

      // Act: Try to create duplicate
      const duplicateData = {
        skill_name: skillName,
        category: 'Framework'
      };

      const response = await request(app)
        .post('/api/skills')
        .send(duplicateData)
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Skill name already exists');
    });
  });

  describe('GET /api/skills - Get all skills', () => {
    test('should get all skills', async () => {
      // Arrange: Create test skill
      const skillData = {
        skill_name: `Get All Test ${Date.now()}`,
        category: 'Programming Language'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      createdSkillIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by category', async () => {
      // Arrange
      const skillData = {
        skill_name: `Framework Test ${Date.now()}`,
        category: 'Framework'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      createdSkillIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/skills')
        .query({ category: 'Framework' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(skill => {
          expect(skill.category).toBe('Framework');
        });
      }
    });

    test('should search by skill name', async () => {
      // Arrange
      const uniqueName = `SearchTest${Date.now()}`;
      const skillData = {
        skill_name: uniqueName,
        category: 'Programming Language'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      createdSkillIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/skills')
        .query({ search: uniqueName })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(s => s.skill_name === uniqueName)).toBe(true);
    });

    test('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/skills')
        .query({ page: 1, limit: 5 })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/skills/:id - Get skill by ID', () => {
    test('should get skill by ID', async () => {
      // Arrange
      const skillData = {
        skill_name: `Get By ID Test ${Date.now()}`,
        category: 'Programming Language',
        description: 'Test description'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = createResponse.body.data.id;
      createdSkillIds.push(skillId);

      // Act
      const response = await request(app)
        .get(`/api/skills/${skillId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', skillId);
      expect(response.body.data.skill_name).toBe(skillData.skill_name);
      expect(response.body.data.category).toBe(skillData.category);
    });

    test('should return 404 for non-existent skill', async () => {
      // Act
      const response = await request(app)
        .get('/api/skills/99999')
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('PUT /api/skills/:id - Update skill', () => {
    test('should update skill with valid data', async () => {
      // Arrange
      const skillData = {
        skill_name: `Update Test ${Date.now()}`,
        category: 'Programming Language'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = createResponse.body.data.id;
      createdSkillIds.push(skillId);

      const updateData = {
        skill_name: `Updated Skill ${Date.now()}`,
        description: 'Updated description'
      };

      // Act
      const response = await request(app)
        .put(`/api/skills/${skillId}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Skill updated successfully');
      expect(response.body.data.id).toBe(skillId);
      expect(response.body.data.skill_name).toBe(updateData.skill_name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    test('should return 404 when updating non-existent skill', async () => {
      // Act
      const response = await request(app)
        .put('/api/skills/99999')
        .send({ skill_name: 'Updated Name' })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should return 409 when updating to duplicate skill name', async () => {
      // Arrange
      const skillName1 = `Duplicate1 ${Date.now()}`;
      const skillName2 = `Duplicate2 ${Date.now()}`;

      const skill1 = await request(app)
        .post('/api/skills')
        .send({
          skill_name: skillName1,
          category: 'Programming Language'
        })
        .expect(201);

      const skill2 = await request(app)
        .post('/api/skills')
        .send({
          skill_name: skillName2,
          category: 'Programming Language'
        })
        .expect(201);

      createdSkillIds.push(skill1.body.data.id, skill2.body.data.id);

      // Act: Try to update skill2 with skill1's name
      const response = await request(app)
        .put(`/api/skills/${skill2.body.data.id}`)
        .send({ skill_name: skillName1 })
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Skill name already exists');
    });
  });

  describe('DELETE /api/skills/:id - Delete skill', () => {
    test('should delete skill successfully when not in use', async () => {
      // Arrange
      const skillData = {
        skill_name: `Delete Test ${Date.now()}`,
        category: 'Programming Language'
      };

      const createResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = createResponse.body.data.id;

      // Act
      const deleteResponse = await request(app)
        .delete(`/api/skills/${skillId}`)
        .expect(200);

      // Assert
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Skill deleted successfully');

      // Verify skill is deleted
      await request(app)
        .get(`/api/skills/${skillId}`)
        .expect(404);
    });

    test('should return 404 when deleting non-existent skill', async () => {
      // Act
      const response = await request(app)
        .delete('/api/skills/99999')
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should return 409 when skill is in use', async () => {
      // Arrange: Create skill
      const skillData = {
        skill_name: `In Use Test ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      // Create personnel
      const personnelData = {
        name: 'Test User',
        email: `testuser.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Assign skill to personnel
      const assignResponse = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skillId,
          proficiency_level: 'Advanced'
        })
        .expect(201);

      createdAssignmentIds.push(assignResponse.body.data.id);

      // Act: Try to delete skill
      const response = await request(app)
        .delete(`/api/skills/${skillId}`)
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('currently assigned to');
    });
  });
});

