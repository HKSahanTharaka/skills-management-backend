/**
 * Matching Service Unit Tests
 * 
 * Tests matching algorithm logic with mocked database.
 * These tests focus on the matching algorithm business logic.
 */

const { findMatchingPersonnel } = require('../../src/controllers/matching.controller');

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn()
  }
}));

const { pool } = require('../../src/config/database');

describe('Matching Service', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks before each test (clears both call history and implementations)
    jest.resetAllMocks();

    // Setup mock request object
    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    // Setup mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  describe('findMatchingPersonnel', () => {
    test('should return 400 when project_id is missing', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'project_id is required'
        }
      });
    });

    test('should return 404 when project not found', async () => {
      // Arrange
      mockReq.body = { project_id: 999 };

      pool.execute.mockResolvedValueOnce([[]]); // Project not found

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Project not found'
        }
      });
    });

    test('should return 400 when project has no required skills', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      pool.execute
        .mockResolvedValueOnce([[project]]) // Project exists
        .mockResolvedValueOnce([[]]); // No required skills

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Project has no required skills defined'
        }
      });
    });

    test('should find matching personnel with perfect match', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Web Development Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        },
        {
          skill_id: 2,
          skill_name: 'React',
          minimum_proficiency: 'Intermediate'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'John Doe',
          role_title: 'Senior Developer',
          experience_level: 'Senior'
        }
      ];

      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        },
        {
          personnel_id: 1,
          skill_id: 2,
          skill_name: 'React',
          proficiency_level: 'Advanced'
        }
      ];

      pool.execute
        .mockResolvedValueOnce([[project]]) // Get project
        .mockResolvedValueOnce([requiredSkills]) // Get required skills
        .mockResolvedValueOnce([personnel]) // Get all personnel
        .mockResolvedValueOnce([personnelSkills]) // Get personnel skills
        .mockResolvedValueOnce([[]]); // Get availability (empty - defaults to 100)

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        projectId: 1,
        projectName: 'Web Development Project',
        requiredSkills: expect.arrayContaining([
          expect.objectContaining({
            skillId: 1,
            skillName: 'JavaScript'
          })
        ]),
        matchedPersonnel: expect.arrayContaining([
          expect.objectContaining({
            personnelId: 1,
            name: 'John Doe',
            matchScore: 100, // Perfect match
            matchingSkills: expect.arrayContaining([
              expect.objectContaining({
                skillName: 'JavaScript',
                meets: true
              })
            ])
          })
        ])
      });
    });

    test('should calculate match score correctly for partial match', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        },
        {
          skill_id: 2,
          skill_name: 'React',
          minimum_proficiency: 'Intermediate'
        },
        {
          skill_id: 3,
          skill_name: 'Node.js',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'John Doe',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        }
      ];

      // Personnel has only 2 out of 3 required skills
      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert' // Meets requirement
        },
        {
          personnel_id: 1,
          skill_id: 2,
          skill_name: 'React',
          proficiency_level: 'Advanced' // Meets requirement
        }
        // Missing Node.js
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel])
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([[]]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.matchedPersonnel[0].matchScore).toBe(67); // 2/3 * 100 = 66.67, rounded to 67
    });

    test('should filter by experience level when provided', async () => {
      // Arrange
      mockReq.body = {
        project_id: 1,
        additional_filters: {
          experience_level: 'Senior'
        }
      };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'Senior Dev',
          role_title: 'Senior Developer',
          experience_level: 'Senior'
        }
      ];

      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        }
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel]) // Filtered by experience_level
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([[]]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(5);
      const personnelQuery = pool.execute.mock.calls[2][0];
      expect(personnelQuery).toContain('experience_level = ?');
    });

    test('should filter by availability percentage', async () => {
      // Arrange
      mockReq.body = {
        project_id: 1,
        additional_filters: {
          availability_percentage: 80
        }
      };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'Available Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        },
        {
          id: 2,
          name: 'Busy Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        }
      ];

      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        },
        {
          personnel_id: 2,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        }
      ];

      const availability = [
        {
          personnel_id: 1,
          avg_availability: 90
        },
        {
          personnel_id: 2,
          avg_availability: 50 // Below threshold
        }
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel])
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([availability]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      // Only personnel with availability >= 80 should be included
      expect(response.matchedPersonnel.length).toBe(1);
      expect(response.matchedPersonnel[0].personnelId).toBe(1);
    });

    test('should sort results by match score, experience, and availability', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'Junior Dev',
          role_title: 'Developer',
          experience_level: 'Junior'
        },
        {
          id: 2,
          name: 'Senior Dev',
          role_title: 'Senior Developer',
          experience_level: 'Senior'
        }
      ];

      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        },
        {
          personnel_id: 2,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        }
      ];

      const availability = [
        {
          personnel_id: 1,
          avg_availability: 100
        },
        {
          personnel_id: 2,
          avg_availability: 90
        }
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel])
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([availability]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      // Senior should come first (same match score, but higher experience)
      expect(response.matchedPersonnel[0].personnelId).toBe(2);
      expect(response.matchedPersonnel[0].experienceLevel).toBe('Senior');
    });

    test('should exclude personnel with no matching skills', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'Matching Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        },
        {
          id: 2,
          name: 'Non-Matching Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        }
      ];

      // Only first personnel has the required skill
      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert'
        }
        // Personnel 2 has no skills
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel])
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([[]]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      // Only personnel with at least one matching skill should be included
      expect(response.matchedPersonnel.length).toBe(1);
      expect(response.matchedPersonnel[0].personnelId).toBe(1);
    });

    test('should check proficiency level meets minimum requirement', async () => {
      // Arrange
      mockReq.body = { project_id: 1 };

      const project = {
        id: 1,
        project_name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const requiredSkills = [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          minimum_proficiency: 'Advanced'
        }
      ];

      const personnel = [
        {
          id: 1,
          name: 'Qualified Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        },
        {
          id: 2,
          name: 'Unqualified Dev',
          role_title: 'Developer',
          experience_level: 'Mid-Level'
        }
      ];

      const personnelSkills = [
        {
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Expert' // Meets Advanced requirement
        },
        {
          personnel_id: 2,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Intermediate' // Does not meet Advanced requirement
        }
      ];

      pool.execute
        .mockResolvedValueOnce([[project]])
        .mockResolvedValueOnce([requiredSkills])
        .mockResolvedValueOnce([personnel])
        .mockResolvedValueOnce([personnelSkills])
        .mockResolvedValueOnce([[]]);

      // Act
      await findMatchingPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      // Only personnel with matchCount > 0 are included
      // Personnel 2 has the skill but doesn't meet proficiency, so matchCount = 0 and they're excluded
      expect(response.matchedPersonnel.length).toBe(1);
      expect(response.matchedPersonnel[0].personnelId).toBe(1);
      expect(response.matchedPersonnel[0].matchScore).toBe(100); // Qualified - meets proficiency
    });
  });
});

