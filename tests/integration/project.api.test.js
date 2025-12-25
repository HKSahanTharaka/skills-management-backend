/**
 * Project API Integration Tests
 * 
 * Test all project endpoints with actual database connection.
 * These tests verify the complete API flow from request to response.
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Project API', () => {
  // Test data storage for cleanup
  let createdProjectIds = [];
  let createdSkillIds = [];
  let createdRequiredSkillIds = [];

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

    // Clean up required skills
    if (createdRequiredSkillIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM project_required_skills WHERE id IN (${createdRequiredSkillIds.map(() => '?').join(',')})`,
          createdRequiredSkillIds
        );
      } catch (error) {
        console.error('Error cleaning up required skills:', error.message);
      }
    }

    // Clean up projects
    if (createdProjectIds.length > 0) {
      try {
        await pool.execute(
          `DELETE FROM projects WHERE id IN (${createdProjectIds.map(() => '?').join(',')})`,
          createdProjectIds
        );
        console.log('Test project data cleaned up');
      } catch (error) {
        console.error('Error cleaning up projects:', error.message);
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

  describe('POST /api/projects - Create project', () => {
    test('should create new project with valid data', async () => {
      // Arrange: Set up test data
      const projectData = {
        project_name: `Test Project ${Date.now()}`,
        description: 'A test project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'Planning'
      };

      // Act: Execute the endpoint
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      // Assert: Check the result
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Project created successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.project_name).toBe(projectData.project_name);
      expect(response.body.data.start_date).toBe(projectData.start_date);
      expect(response.body.data.end_date).toBe(projectData.end_date);
      expect(response.body.data.status).toBe(projectData.status);

      // Store ID for cleanup
      createdProjectIds.push(response.body.data.id);
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange
      const projectData = {
        project_name: 'Test Project'
        // Missing start_date, end_date
      };

      // Act
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should return 400 when end_date is before start_date', async () => {
      // Arrange
      const projectData = {
        project_name: 'Test Project',
        start_date: '2024-12-31',
        end_date: '2024-01-01' // End date before start date
      };

      // Act
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('end_date must be after start_date');
    });

    test('should return 400 when status is invalid', async () => {
      // Arrange
      const projectData = {
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'Invalid Status'
      };

      // Act
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid status');
    });
  });

  describe('GET /api/projects - Get all projects', () => {
    test('should get all projects', async () => {
      // Arrange: Create test project
      const projectData = {
        project_name: `Get All Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      createdProjectIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by status', async () => {
      // Arrange
      const projectData = {
        project_name: `Active Project ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'Active'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      createdProjectIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/projects')
        .query({ status: 'Active' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(project => {
          expect(project.status).toBe('Active');
        });
      }
    });

    test('should search by project name', async () => {
      // Arrange
      const uniqueName = `SearchTest${Date.now()}`;
      const projectData = {
        project_name: uniqueName,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      createdProjectIds.push(createResponse.body.data.id);

      // Act
      const response = await request(app)
        .get('/api/projects')
        .query({ search: uniqueName })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(p => p.project_name === uniqueName)).toBe(true);
    });

    test('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 5 })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('GET /api/projects/:id - Get project by ID', () => {
    test('should get project by ID with required skills', async () => {
      // Arrange
      const projectData = {
        project_name: `Get By ID Test ${Date.now()}`,
        description: 'Test project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.data.id;
      createdProjectIds.push(projectId);

      // Act
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', projectId);
      expect(response.body.data.project_name).toBe(projectData.project_name);
      expect(response.body.data).toHaveProperty('required_skills');
      expect(Array.isArray(response.body.data.required_skills)).toBe(true);
      expect(response.body.data).toHaveProperty('allocated_personnel');
      expect(Array.isArray(response.body.data.allocated_personnel)).toBe(true);
    });

    test('should return 404 for non-existent project', async () => {
      // Act
      const response = await request(app)
        .get('/api/projects/99999')
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('PUT /api/projects/:id - Update project', () => {
    test('should update project with valid data', async () => {
      // Arrange
      const projectData = {
        project_name: `Update Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.data.id;
      createdProjectIds.push(projectId);

      const updateData = {
        project_name: `Updated Project ${Date.now()}`,
        status: 'Active'
      };

      // Act
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.project_name).toBe(updateData.project_name);
      expect(response.body.data.status).toBe(updateData.status);
    });

    test('should return 404 when updating non-existent project', async () => {
      // Act
      const response = await request(app)
        .put('/api/projects/99999')
        .send({ project_name: 'Updated Name' })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('DELETE /api/projects/:id - Delete project', () => {
    test('should delete project successfully', async () => {
      // Arrange
      const projectData = {
        project_name: `Delete Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Act
      const deleteResponse = await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(200);

      // Assert
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Project deleted successfully');

      // Verify project is deleted
      await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(404);
    });
  });

  describe('POST /api/projects/:id/required-skills - Add required skill', () => {
    test('should add required skill to project successfully', async () => {
      // Arrange: Create project
      const projectData = {
        project_name: `Required Skill Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      // Create skill
      const skillData = {
        skill_name: `Required Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      // Act: Add required skill
      const requiredSkillData = {
        skill_id: skillId,
        minimum_proficiency: 'Advanced'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send(requiredSkillData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Required skill added to project successfully');
      expect(response.body.data).toHaveProperty('project_id', projectId);
      expect(response.body.data).toHaveProperty('skill_id', skillId);
      expect(response.body.data.minimum_proficiency).toBe('Advanced');

      createdRequiredSkillIds.push(response.body.data.id);
    });

    test('should return 404 when project not found', async () => {
      // Act
      const response = await request(app)
        .post('/api/projects/99999/required-skills')
        .send({
          skill_id: 1,
          minimum_proficiency: 'Advanced'
        })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should return 409 when skill already required', async () => {
      // Arrange: Create project and skill
      const projectData = {
        project_name: `Duplicate Skill Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      const skillData = {
        skill_name: `Duplicate Test Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      // Add skill first time
      await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skillId,
          minimum_proficiency: 'Advanced'
        })
        .expect(201);

      // Act: Try to add same skill again
      const response = await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skillId,
          minimum_proficiency: 'Intermediate'
        })
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already required');
    });
  });

  describe('PUT /api/projects/:projectId/required-skills/:skillId - Update required skill', () => {
    test('should update required skill proficiency', async () => {
      // Arrange: Create project and add required skill
      const projectData = {
        project_name: `Update Skill Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      const skillData = {
        skill_name: `Update Test Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skillId,
          minimum_proficiency: 'Intermediate'
        })
        .expect(201);

      // Act: Update proficiency
      const response = await request(app)
        .put(`/api/projects/${projectId}/required-skills/${skillId}`)
        .send({
          minimum_proficiency: 'Expert'
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Required skill updated successfully');
      expect(response.body.data.minimum_proficiency).toBe('Expert');
    });
  });

  describe('DELETE /api/projects/:projectId/required-skills/:skillId - Remove required skill', () => {
    test('should remove required skill successfully', async () => {
      // Arrange: Create project and add required skill
      const projectData = {
        project_name: `Remove Skill Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      const skillData = {
        skill_name: `Remove Test Skill ${Date.now()}`,
        category: 'Programming Language'
      };

      const skillResponse = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      const skillId = skillResponse.body.data.id;
      createdSkillIds.push(skillId);

      await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skillId,
          minimum_proficiency: 'Advanced'
        })
        .expect(201);

      // Act: Remove skill
      const response = await request(app)
        .delete(`/api/projects/${projectId}/required-skills/${skillId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Required skill removed from project successfully');
    });
  });
});

