/**
 * Personnel Service Unit Tests
 * 
 * Tests individual functions from personnel controller with mocked database.
 * These tests focus on business logic without hitting the actual database.
 */

const {
  createPersonnel,
  getAllPersonnel,
  getPersonnelById,
  updatePersonnel,
  deletePersonnel,
  getPersonnelSkills,
  assignSkillToPersonnel,
  updateSkillProficiency,
  removeSkillFromPersonnel
} = require('../../src/controllers/personnel.controller');

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn()
  }
}));

const { pool } = require('../../src/config/database');

describe('Personnel Service', () => {
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

  describe('createPersonnel', () => {
    test('should create personnel with valid data', async () => {
      // Arrange: Set up test data
      const personnelData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        role_title: 'Software Engineer',
        experience_level: 'Senior',
        bio: 'Experienced developer',
        profile_image_url: 'https://example.com/image.jpg'
      };

      mockReq.body = personnelData;

      // Mock database responses
      pool.execute
        .mockResolvedValueOnce([[]]) // Email uniqueness check - no existing personnel
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert personnel
        .mockResolvedValueOnce([[{
          id: 1,
          ...personnelData,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }]]); // Fetch created personnel

      // Act: Execute the function
      await createPersonnel(mockReq, mockRes, mockNext);

      // Assert: Check the result
      expect(pool.execute).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Personnel created successfully',
        data: expect.objectContaining({
          id: 1,
          name: personnelData.name,
          email: personnelData.email
        })
      });
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange: Missing required fields
      mockReq.body = {
        name: 'John Doe'
        // Missing email, role_title, experience_level
      };

      // Act
      await createPersonnel(mockReq, mockRes, mockNext);

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

    test('should return 400 when email format is invalid', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'invalid-email',
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      // Act
      await createPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid email format'
        }
      });
    });

    test('should return 400 when experience_level is invalid', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        role_title: 'Developer',
        experience_level: 'Invalid-Level'
      };

      // Act
      await createPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('Invalid experience_level')
        }
      });
    });

    test('should return 409 when email already exists', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'existing@example.com',
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      // Mock: Email already exists
      pool.execute.mockResolvedValueOnce([[{ id: 1 }]]);

      // Act
      await createPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });
    });
  });

  describe('getAllPersonnel', () => {
    test('should get all personnel without filters', async () => {
      // Arrange
      mockReq.query = { page: 1, limit: 10 };

      const mockPersonnel = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ];

      pool.execute
        .mockResolvedValueOnce([[{ total: 2 }]]) // Count query - returns [rows] where rows is [{total: 2}]
        .mockResolvedValueOnce([mockPersonnel]); // Data query - returns [rows] where rows is the personnel array

      // Act
      await getAllPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPersonnel,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 2
        })
      });
    });

    test('should filter by experience_level', async () => {
      // Arrange
      mockReq.query = {
        experience_level: 'Senior',
        page: 1,
        limit: 10
      };

      pool.execute
        .mockResolvedValueOnce([[{ total: 1 }]]) // Count query - returns [rows]
        .mockResolvedValueOnce([[
          { id: 1, name: 'John Doe', experience_level: 'Senior' }
        ]]); // Data query - returns [rows]

      // Act
      await getAllPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(2);
      const queryCall = pool.execute.mock.calls[0][0];
      expect(queryCall).toContain('experience_level = ?');
    });

    test('should search by name or email', async () => {
      // Arrange
      mockReq.query = {
        search: 'john',
        page: 1,
        limit: 10
      };

      pool.execute
        .mockResolvedValueOnce([[{ total: 1 }]]) // Count query - returns [rows]
        .mockResolvedValueOnce([[
          { id: 1, name: 'John Doe', email: 'john@example.com' }
        ]]); // Data query - returns [rows]

      // Act
      await getAllPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(2);
      const queryCall = pool.execute.mock.calls[0][0];
      expect(queryCall).toContain('name LIKE ? OR email LIKE ?');
    });
  });

  describe('getPersonnelById', () => {
    test('should get personnel by ID with skills', async () => {
      // Arrange
      mockReq.params.id = '1';

      const mockPersonnel = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role_title: 'Developer',
        experience_level: 'Senior'
      };

      const mockSkills = [
        {
          id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          category: 'Programming Language',
          proficiency_level: 'Advanced',
          years_of_experience: 5
        }
      ];

      // pool.execute returns [rows, fields]
      // First call: const [personnel] = await pool.execute(...) -> personnel = [mockPersonnel]
      // Second call: const [skills] = await pool.execute(...) -> skills = mockSkills (which is already an array)
      pool.execute
        .mockResolvedValueOnce([[mockPersonnel]]) // Returns [rows] where rows is [mockPersonnel]
        .mockResolvedValueOnce([mockSkills]); // Returns [rows] where rows is mockSkills (array of skill objects)

      // Act
      await getPersonnelById(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        id: mockPersonnel.id,
        name: mockPersonnel.name,
        email: mockPersonnel.email,
        role_title: mockPersonnel.role_title,
        experience_level: mockPersonnel.experience_level
      });
      expect(responseData.data.skills).toEqual(mockSkills);
    });

    test('should return 404 when personnel not found', async () => {
      // Arrange
      mockReq.params.id = '999';

      // pool.execute returns [rows, fields] where rows is an array
      // Empty array means no results found
      // When we do const [personnel] = await pool.execute(...), personnel = []
      // We need to ensure the mock returns an empty array for rows
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await getPersonnelById(mockReq, mockRes, mockNext);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      // Verify the mock was called with the correct query
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT * FROM personnel WHERE id = ?',
        ['999']
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    });
  });

  describe('updatePersonnel', () => {
    test('should update personnel with valid data', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {
        name: 'Updated Name',
        role_title: 'Senior Developer'
      };

      const existingPersonnel = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role_title: 'Developer',
        experience_level: 'Junior'
      };

      const updatedPersonnel = {
        ...existingPersonnel,
        ...mockReq.body
      };

      pool.execute
        .mockResolvedValueOnce([[existingPersonnel]]) // Check existence
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update
        .mockResolvedValueOnce([[updatedPersonnel]]); // Fetch updated

      // Act
      await updatePersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Personnel updated successfully',
        data: expect.objectContaining({
          name: 'Updated Name',
          role_title: 'Senior Developer'
        })
      });
    });

    test('should return 404 when personnel not found', async () => {
      // Arrange
      mockReq.params.id = '999';
      mockReq.body = { name: 'Updated Name' };

      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await updatePersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    });

    test('should return 409 when email already exists', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = { email: 'existing@example.com' };

      const existingPersonnel = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      pool.execute
        .mockResolvedValueOnce([[existingPersonnel]])
        .mockResolvedValueOnce([[{ id: 2 }]]); // Email exists for another personnel

      // Act
      await updatePersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });
    });
  });

  describe('deletePersonnel', () => {
    test('should delete personnel successfully', async () => {
      // Arrange
      mockReq.params.id = '1';

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Check existence
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete

      // Act
      await deletePersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Personnel deleted successfully'
      });
    });

    test('should return 404 when personnel not found', async () => {
      // Arrange
      mockReq.params.id = '999';

      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await deletePersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    });
  });

  describe('assignSkillToPersonnel', () => {
    test('should assign skill to personnel successfully', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {
        skill_id: 1,
        proficiency_level: 'Advanced',
        years_of_experience: 5
      };

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Personnel exists
        .mockResolvedValueOnce([[{ id: 1, skill_name: 'JavaScript' }]]) // Skill exists
        .mockResolvedValueOnce([[]]) // No existing assignment
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert assignment
        .mockResolvedValueOnce([[{
          id: 1,
          personnel_id: 1,
          skill_id: 1,
          skill_name: 'JavaScript',
          proficiency_level: 'Advanced',
          years_of_experience: 5
        }]]); // Fetch assignment

      // Act
      await assignSkillToPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill assigned to personnel successfully',
        data: expect.objectContaining({
          skill_id: 1,
          proficiency_level: 'Advanced'
        })
      });
    });

    test('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {
        skill_id: 1
        // Missing proficiency_level
      };

      // Act
      await assignSkillToPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('Missing required fields')
        }
      });
    });

    test('should return 409 when skill already assigned', async () => {
      // Arrange
      mockReq.params.id = '1';
      mockReq.body = {
        skill_id: 1,
        proficiency_level: 'Advanced'
      };

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ id: 1 }]]); // Assignment already exists

      // Act
      await assignSkillToPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Skill is already assigned to this personnel'
        }
      });
    });
  });

  describe('updateSkillProficiency', () => {
    test('should update skill proficiency successfully', async () => {
      // Arrange
      mockReq.params.personnelId = '1';
      mockReq.params.skillId = '1';
      mockReq.body = {
        proficiency_level: 'Expert',
        years_of_experience: 7
      };

      pool.execute
        .mockResolvedValueOnce([[{
          id: 1,
          personnel_id: 1,
          skill_id: 1,
          proficiency_level: 'Advanced'
        }]]) // Assignment exists
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update
        .mockResolvedValueOnce([[{
          id: 1,
          personnel_id: 1,
          skill_id: 1,
          proficiency_level: 'Expert',
          years_of_experience: 7
        }]]); // Fetch updated

      // Act
      await updateSkillProficiency(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill proficiency updated successfully',
        data: expect.objectContaining({
          proficiency_level: 'Expert',
          years_of_experience: 7
        })
      });
    });

    test('should return 400 when no fields provided', async () => {
      // Arrange
      mockReq.params.personnelId = '1';
      mockReq.params.skillId = '1';
      mockReq.body = {};

      // Act
      await updateSkillProficiency(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: expect.stringContaining('At least one field')
        }
      });
    });
  });

  describe('removeSkillFromPersonnel', () => {
    test('should remove skill from personnel successfully', async () => {
      // Arrange
      mockReq.params.personnelId = '1';
      mockReq.params.skillId = '1';

      pool.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Assignment exists
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete

      // Act
      await removeSkillFromPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill removed from personnel successfully'
      });
    });

    test('should return 404 when assignment not found', async () => {
      // Arrange
      mockReq.params.personnelId = '1';
      mockReq.params.skillId = '1';

      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      await removeSkillFromPersonnel(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Personnel skill assignment not found'
        }
      });
    });
  });
});

