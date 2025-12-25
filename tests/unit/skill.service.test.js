/**
 * Skill Service Unit Tests
 * 
 * Tests individual functions from skill controller with mocked database.
 * These tests focus on business logic without hitting the actual database.
 */

const {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill
} = require('../../src/controllers/skill.controller');

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn()
  }
}));

const { pool } = require('../../src/config/database');

describe('Skill Service', () => {
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

  describe('createSkill', () => {
    test('should create skill with valid data', async () => {
      // Arrange: Set up test data
      const skillData = {
        skill_name: 'JavaScript',
        category: 'Programming Language',
        description: 'A high-level programming language'
      };

      mockReq.body = skillData;

      // Mock database responses
      pool.execute
        .mockResolvedValueOnce([[]]) // Skill name uniqueness check - no existing skill
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert skill
        .mockResolvedValueOnce([[{
          id: 1,
          ...skillData,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }]]); // Fetch created skill

      // Act: Execute the function
      await createSkill(mockReq, mockRes, mockNext);

      // Assert: Check the result
      expect(pool.execute).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill created successfully',
        data: expect.objectContaining({
          id: 1,
          skill_name: skillData.skill_name,
          category: skillData.category
        })
      });
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange: Missing required fields
      mockReq.body = {
        skill_name: 'JavaScript'
        // Missing category
      };

      // Act
      await createSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('Missing required fields')
        }
      });
      expect(pool.execute).not.toHaveBeenCalled();
    });

    test('should return 400 when category is invalid', async () => {
      // Arrange
      mockReq.body = {
        skill_name: 'JavaScript',
        category: 'Invalid Category'
      };

      // Act
      await createSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('Invalid category')
        }
      });
    });

    test('should return 409 when skill name already exists', async () => {
      // Arrange
      mockReq.body = {
        skill_name: 'JavaScript',
        category: 'Programming Language'
      };

      // Mock: Skill name already exists
      pool.execute.mockResolvedValueOnce([[{ id: 1 }]]);

      // Act
      await createSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill name already exists'
        }
      });
    });

    test('should create skill without description', async () => {
      // Arrange
      mockReq.body = {
        skill_name: 'Python',
        category: 'Programming Language'
      };

      pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 2 }])
        .mockResolvedValueOnce([[{
          id: 2,
          skill_name: 'Python',
          category: 'Programming Language',
          description: null
        }]]);

      // Act
      await createSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill created successfully',
        data: expect.objectContaining({
          skill_name: 'Python'
        })
      });
    });
  });

  describe('getAllSkills', () => {
    test('should get all skills without filters', async () => {
      // Arrange
      mockReq.query = {};

      const mockSkills = [
        { id: 1, skill_name: 'JavaScript', category: 'Programming Language' },
        { id: 2, skill_name: 'React', category: 'Framework' }
      ];

      pool.execute.mockResolvedValueOnce([mockSkills]);

      // Act
      await getAllSkills(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSkills
      });
    });

    test('should filter by category', async () => {
      // Arrange
      mockReq.query = {
        category: 'Programming Language'
      };

      const mockSkills = [
        { id: 1, skill_name: 'JavaScript', category: 'Programming Language' }
      ];

      pool.execute.mockResolvedValueOnce([mockSkills]);

      // Act
      await getAllSkills(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const queryCall = pool.execute.mock.calls[0][0];
      expect(queryCall).toContain('category = ?');
    });

    test('should search by skill name', async () => {
      // Arrange
      mockReq.query = {
        search: 'java'
      };

      const mockSkills = [
        { id: 1, skill_name: 'JavaScript', category: 'Programming Language' }
      ];

      pool.execute.mockResolvedValueOnce([mockSkills]);

      // Act
      await getAllSkills(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const queryCall = pool.execute.mock.calls[0][0];
      expect(queryCall).toContain('skill_name LIKE ?');
    });

    test('should support pagination', async () => {
      // Arrange
      mockReq.query = {
        page: 1,
        limit: 10
      };

      pool.execute
        .mockResolvedValueOnce([[{ total: 20 }]]) // Count query returns [rows]
        .mockResolvedValueOnce([[
          { id: 1, skill_name: 'JavaScript' },
          { id: 2, skill_name: 'Python' }
        ]]); // Data query returns [rows]

      // Act
      await getAllSkills(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 20
        })
      });
    });
  });

  describe('getSkillById', () => {
    test('should get skill by ID', async () => {
      // Arrange
      mockReq.params.id = '1';

      const mockSkill = {
        id: 1,
        skill_name: 'JavaScript',
        category: 'Programming Language',
        description: 'A programming language'
      };

      // pool.execute returns [rows] where rows is an array
      pool.execute.mockResolvedValueOnce([[mockSkill]]);

      // Act
      await getSkillById(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSkill
      });
    });

    test('should return 404 when skill not found', async () => {
      // Arrange
      mockReq.params.id = '999';

      // pool.execute returns [rows] where rows is an array
      // Empty array means no results found
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await getSkillById(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    });
  });

  describe('updateSkill', () => {
    test('should update skill with valid data', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {
        skill_name: 'Updated JavaScript',
        description: 'Updated description'
      };

      const existingSkill = {
        id: 1,
        skill_name: 'JavaScript',
        category: 'Programming Language',
        description: 'Original description'
      };

      const updatedSkill = {
        ...existingSkill,
        ...mockReq.body
      };

      // The function will:
      // 1. Check if skill exists
      // 2. Check if new skill_name already exists (since we're changing it)
      // 3. Update the skill
      // 4. Fetch the updated skill
      pool.execute
        .mockResolvedValueOnce([[existingSkill]]) // First call: check existence
        .mockResolvedValueOnce([[]]) // Second call: check name uniqueness (no duplicate found)
        .mockResolvedValueOnce([{ affectedRows: 1, insertId: 0, changedRows: 1 }]) // Third call: UPDATE
        .mockResolvedValueOnce([[updatedSkill]]); // Fourth call: fetch updated

      // Act
      await updateSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill updated successfully',
        data: expect.objectContaining({
          skill_name: 'Updated JavaScript',
          description: 'Updated description'
        })
      });
    });

    test('should return 404 when skill not found', async () => {
      // Arrange
      mockReq.params.id = '999';
      mockReq.body = { skill_name: 'Updated Name' };

      // pool.execute returns [rows] where rows is an array
      // Empty array means no results found
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await updateSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    });

    test('should return 409 when skill name already exists', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = { skill_name: 'Existing Skill' };

      const existingSkill = {
        id: 1,
        skill_name: 'JavaScript',
        category: 'Programming Language'
      };

      pool.execute
        .mockResolvedValueOnce([[existingSkill]])
        .mockResolvedValueOnce([[{ id: 2 }]]); // Name exists for another skill

      // Act
      await updateSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill name already exists'
        }
      });
    });

    test('should return 400 when no fields provided', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {};

      const existingSkill = {
        id: 1,
        skill_name: 'JavaScript',
        category: 'Programming Language'
      };

      pool.execute.mockResolvedValueOnce([[existingSkill]]);

      // Act
      await updateSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'No fields provided to update'
        }
      });
    });

    test('should validate category when provided', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = { category: 'Invalid Category' };

      const existingSkill = {
        id: 1,
        skill_name: 'JavaScript',
        category: 'Programming Language'
      };

      pool.execute.mockResolvedValueOnce([[existingSkill]]);

      // Act
      await updateSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('Invalid category')
        }
      });
    });
  });

  describe('deleteSkill', () => {
    test('should delete skill successfully when not in use', async () => {
      // Arrange
      mockReq.params.id = '1';

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Check existence - returns [rows]
        .mockResolvedValueOnce([[{ count: 0 }]]) // Check usage - returns [rows] with count
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete - returns result object

      // Act
      await deleteSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill deleted successfully'
      });
    });

    test('should return 404 when skill not found', async () => {
      // Arrange
      mockReq.params.id = '999';

      // pool.execute returns [rows] where rows is an array
      // Empty array means no results found
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await deleteSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    });

    test('should return 409 when skill is in use', async () => {
      // Arrange
      mockReq.params.id = '1';

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Check existence - returns [rows]
        .mockResolvedValueOnce([[{ count: 5 }]]); // Check usage - returns [rows] with count

      // Act
      await deleteSkill(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('currently assigned to')
        }
      });
    });
  });
});

