/**
 * Matching API Integration Tests
 * 
 * Test matching endpoint with actual database connection.
 * These tests verify the complete matching algorithm flow.
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Matching API', () => {
  // Test data storage for cleanup
  let createdProjectIds = [];
  let createdPersonnelIds = [];
  let createdSkillIds = [];
  let createdRequiredSkillIds = [];
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
      } catch (error) {
        console.error('Error cleaning up projects:', error.message);
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
        console.log('Test matching data cleaned up');
      } catch (error) {
        console.error('Error cleaning up skills:', error.message);
      }
    }

    // Close database pool
    await pool.end();
  });

  describe('POST /api/matching/find-personnel - Find matching personnel', () => {
    test('should return 400 when project_id is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('project_id is required');
    });

    test('should return 404 when project not found', async () => {
      // Act
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({ project_id: 99999 })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Project not found');
    });

    test('should return 400 when project has no required skills', async () => {
      // Arrange: Create project without required skills
      const projectData = {
        project_name: `No Skills Project ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      // Act
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({ project_id: projectId })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Project has no required skills defined');
    });

    test('should find matching personnel with perfect match', async () => {
      // Arrange: Create project with required skills
      const projectData = {
        project_name: `Matching Test Project ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      // Create skills
      const skill1Data = {
        skill_name: `JavaScript ${Date.now()}`,
        category: 'Programming Language'
      };

      const skill2Data = {
        skill_name: `React ${Date.now()}`,
        category: 'Framework'
      };

      const skill1Response = await request(app)
        .post('/api/skills')
        .send(skill1Data)
        .expect(201);

      const skill2Response = await request(app)
        .post('/api/skills')
        .send(skill2Data)
        .expect(201);

      const skill1Id = skill1Response.body.data.id;
      const skill2Id = skill2Response.body.data.id;
      createdSkillIds.push(skill1Id, skill2Id);

      // Add required skills to project
      await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skill1Id,
          minimum_proficiency: 'Advanced'
        })
        .expect(201);

      await request(app)
        .post(`/api/projects/${projectId}/required-skills`)
        .send({
          skill_id: skill2Id,
          minimum_proficiency: 'Intermediate'
        })
        .expect(201);

      // Create personnel with matching skills
      const personnelData = {
        name: 'Matching Developer',
        email: `matching.${Date.now()}@example.com`,
        role_title: 'Senior Developer',
        experience_level: 'Senior'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Assign matching skills to personnel
      const assign1Response = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skill1Id,
          proficiency_level: 'Expert' // Meets Advanced requirement
        })
        .expect(201);

      const assign2Response = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skill2Id,
          proficiency_level: 'Advanced' // Meets Intermediate requirement
        })
        .expect(201);

      createdAssignmentIds.push(assign1Response.body.data.id, assign2Response.body.data.id);

      // Act: Find matching personnel
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({ project_id: projectId })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body).toHaveProperty('projectName');
      expect(response.body).toHaveProperty('requiredSkills');
      expect(response.body).toHaveProperty('matchedPersonnel');
      expect(Array.isArray(response.body.matchedPersonnel)).toBe(true);
      expect(response.body.matchedPersonnel.length).toBeGreaterThan(0);

      const matchedPerson = response.body.matchedPersonnel.find(p => p.personnelId === personnelId);
      expect(matchedPerson).toBeDefined();
      expect(matchedPerson.matchScore).toBe(100); // Perfect match
      expect(matchedPerson.matchingSkills.length).toBe(2);
      expect(matchedPerson.matchingSkills.every(skill => skill.meets === true)).toBe(true);
    });

    test('should calculate match score for partial match', async () => {
      // Arrange: Create project with 3 required skills
      const projectData = {
        project_name: `Partial Match Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      // Create 3 skills
      const skills = [];
      for (let i = 0; i < 3; i++) {
        const skillResponse = await request(app)
          .post('/api/skills')
          .send({
            skill_name: `Skill ${i} ${Date.now()}`,
            category: 'Programming Language'
          })
          .expect(201);
        skills.push(skillResponse.body.data.id);
        createdSkillIds.push(skillResponse.body.data.id);
      }

      // Add all 3 as required skills
      for (const skillId of skills) {
        await request(app)
          .post(`/api/projects/${projectId}/required-skills`)
          .send({
            skill_id: skillId,
            minimum_proficiency: 'Intermediate'
          })
          .expect(201);
      }

      // Create personnel with only 2 of the 3 skills
      const personnelData = {
        name: 'Partial Match Dev',
        email: `partial.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Mid-Level'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Assign only 2 skills
      const assign1Response = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skills[0],
          proficiency_level: 'Advanced'
        })
        .expect(201);

      const assign2Response = await request(app)
        .post(`/api/personnel/${personnelId}/skills`)
        .send({
          skill_id: skills[1],
          proficiency_level: 'Advanced'
        })
        .expect(201);

      createdAssignmentIds.push(assign1Response.body.data.id, assign2Response.body.data.id);

      // Act
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({ project_id: projectId })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      const matchedPerson = response.body.matchedPersonnel.find(p => p.personnelId === personnelId);
      expect(matchedPerson).toBeDefined();
      // Should have 67% match (2 out of 3 skills)
      expect(matchedPerson.matchScore).toBe(67);
    });

    test('should filter by experience level', async () => {
      // Arrange: Create project and skills
      const projectData = {
        project_name: `Experience Filter Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      const skillResponse = await request(app)
        .post('/api/skills')
        .send({
          skill_name: `Filter Skill ${Date.now()}`,
          category: 'Programming Language'
        })
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

      // Create personnel with different experience levels
      const seniorData = {
        name: 'Senior Dev',
        email: `senior.${Date.now()}@example.com`,
        role_title: 'Senior Developer',
        experience_level: 'Senior'
      };

      const juniorData = {
        name: 'Junior Dev',
        email: `junior.${Date.now()}@example.com`,
        role_title: 'Junior Developer',
        experience_level: 'Junior'
      };

      const seniorResponse = await request(app)
        .post('/api/personnel')
        .send(seniorData)
        .expect(201);

      const juniorResponse = await request(app)
        .post('/api/personnel')
        .send(juniorData)
        .expect(201);

      const seniorId = seniorResponse.body.data.id;
      const juniorId = juniorResponse.body.data.id;
      createdPersonnelIds.push(seniorId, juniorId);

      // Assign skills to both
      await request(app)
        .post(`/api/personnel/${seniorId}/skills`)
        .send({
          skill_id: skillId,
          proficiency_level: 'Advanced'
        })
        .expect(201);

      await request(app)
        .post(`/api/personnel/${juniorId}/skills`)
        .send({
          skill_id: skillId,
          proficiency_level: 'Advanced'
        })
        .expect(201);

      // Act: Filter by Senior experience level
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({
          project_id: projectId,
          additional_filters: {
            experience_level: 'Senior'
          }
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      // All matched personnel should be Senior
      response.body.matchedPersonnel.forEach(person => {
        expect(person.experienceLevel).toBe('Senior');
      });
    });

    test('should exclude personnel with no matching skills', async () => {
      // Arrange: Create project with required skill
      const projectData = {
        project_name: `No Match Test ${Date.now()}`,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.data.id;
      createdProjectIds.push(projectId);

      const skillResponse = await request(app)
        .post('/api/skills')
        .send({
          skill_name: `No Match Skill ${Date.now()}`,
          category: 'Programming Language'
        })
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

      // Create personnel without the required skill
      const personnelData = {
        name: 'No Match Dev',
        email: `nomatch.${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Mid-Level'
      };

      const personnelResponse = await request(app)
        .post('/api/personnel')
        .send(personnelData)
        .expect(201);

      const personnelId = personnelResponse.body.data.id;
      createdPersonnelIds.push(personnelId);

      // Act
      const response = await request(app)
        .post('/api/matching/find-personnel')
        .send({ project_id: projectId })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      // Personnel without matching skills should not be included
      const foundPerson = response.body.matchedPersonnel.find(p => p.personnelId === personnelId);
      expect(foundPerson).toBeUndefined();
    });
  });
});

