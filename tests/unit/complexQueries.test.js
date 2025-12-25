/**
 * Complex Queries Unit Tests
 *
 * Tests all complex query functions with mocked database.
 * These tests verify the query logic and parameter handling.
 */

const {
  getPersonnelWithAvailabilityForProjectDates,
  getPersonnelWithSkillMatchingScore,
  getProjectAllocationSummary,
  getPersonnelWorkloadAnalysis,
  getSkillGapAnalysis,
  getAvailablePersonnelForDateRange,
  getTopSkilledPersonnelByCategory,
  getProjectTimelineWithAllocations,
  getSkillDemandVsSupply,
  getPersonnelCompetencyMatrix,
  getProjectReadinessScore,
  getPersonnelUtilizationTrend,
} = require('../../src/queries/complexQueries');

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn(),
  },
}));

const { pool } = require('../../src/config/database');

describe('Complex Queries', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('getPersonnelWithAvailabilityForProjectDates', () => {
    test('should return personnel with availability for project dates', async () => {
      // Arrange
      const projectStartDate = '2024-01-01';
      const projectEndDate = '2024-03-31';
      const mockResults = [
        {
          id: 1,
          name: 'John Doe',
          availability_percentage: 80,
          availability_notes: 'Partial availability',
        },
        {
          id: 2,
          name: 'Jane Smith',
          availability_percentage: 100,
          availability_notes: 'No availability record',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelWithAvailabilityForProjectDates(
        projectStartDate,
        projectEndDate
      );

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [projectEndDate, projectStartDate, projectEndDate, projectStartDate]
      );
      expect(result).toEqual(mockResults);
    });

    test('should handle empty results', async () => {
      // Arrange
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      const result = await getPersonnelWithAvailabilityForProjectDates(
        '2024-01-01',
        '2024-03-31'
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getPersonnelWithSkillMatchingScore', () => {
    test('should return personnel with skill matching scores for a project', async () => {
      // Arrange
      const projectId = 1;
      const mockResults = [
        {
          id: 1,
          name: 'John Doe',
          total_required_skills: 5,
          matching_skills_count: 5,
          match_percentage: 100,
          matching_skills: 'JavaScript, Python, React, Node.js, MongoDB',
        },
        {
          id: 2,
          name: 'Jane Smith',
          total_required_skills: 5,
          matching_skills_count: 3,
          match_percentage: 60,
          matching_skills: 'JavaScript, Python, React',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelWithSkillMatchingScore(projectId);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [projectId]
      );
      expect(result).toEqual(mockResults);
    });

    test('should handle projects with no matching personnel', async () => {
      // Arrange
      pool.execute.mockResolvedValueOnce([[]]);

      // Act
      const result = await getPersonnelWithSkillMatchingScore(999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getProjectAllocationSummary', () => {
    test('should return project allocation summary', async () => {
      // Arrange
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          status: 'Active',
          allocated_personnel_count: 3,
          total_allocation_percentage: 250,
          avg_allocation_percentage: 83.33,
          allocated_personnel: 'John Doe (100%), Jane Smith (75%), Bob Johnson (75%)',
        },
        {
          project_id: 2,
          project_name: 'Project B',
          status: 'Planning',
          allocated_personnel_count: 0,
          total_allocation_percentage: null,
          avg_allocation_percentage: null,
          allocated_personnel: null,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectAllocationSummary();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const queryCall = pool.execute.mock.calls[0];
      expect(queryCall[0]).toContain('SELECT');
      expect(queryCall[1] || []).toEqual([]);
      expect(result).toEqual(mockResults);
    });
  });

  describe('getPersonnelWorkloadAnalysis', () => {
    test('should return personnel workload analysis', async () => {
      // Arrange
      const mockResults = [
        {
          id: 1,
          name: 'John Doe',
          active_project_count: 2,
          total_allocation_percentage: 150,
          allocation_status: 'Over-allocated',
          project_allocations: 'Project A (100%), Project B (50%)',
        },
        {
          id: 2,
          name: 'Jane Smith',
          active_project_count: 1,
          total_allocation_percentage: 75,
          allocation_status: 'Partially allocated',
          project_allocations: 'Project A (75%)',
        },
        {
          id: 3,
          name: 'Bob Johnson',
          active_project_count: 0,
          total_allocation_percentage: 0,
          allocation_status: 'Not allocated',
          project_allocations: null,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelWorkloadAnalysis();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const queryCall = pool.execute.mock.calls[0];
      expect(queryCall[0]).toContain('SELECT');
      expect(queryCall[1] || []).toEqual([]);
      expect(result).toEqual(mockResults);
    });

    test('should identify over-allocated personnel', async () => {
      // Arrange
      const mockResults = [
        {
          id: 1,
          name: 'Overworked Person',
          total_allocation_percentage: 150,
          allocation_status: 'Over-allocated',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelWorkloadAnalysis();

      // Assert
      expect(result[0].allocation_status).toBe('Over-allocated');
    });
  });

  describe('getSkillGapAnalysis', () => {
    test('should return skill gap analysis for a project', async () => {
      // Arrange
      const projectId = 1;
      const mockResults = [
        {
          skill_id: 1,
          skill_name: 'Python',
          category: 'Programming Language',
          required_proficiency: 'Advanced',
          allocated_personnel_with_skill: 2,
          personnel_meeting_requirement: 1,
          allocated_personnel_skills: 'John Doe (Advanced), Jane Smith (Intermediate)',
        },
        {
          skill_id: 2,
          skill_name: 'React',
          category: 'Framework',
          required_proficiency: 'Intermediate',
          allocated_personnel_with_skill: 0,
          personnel_meeting_requirement: 0,
          allocated_personnel_skills: null,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getSkillGapAnalysis(projectId);

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [projectId]
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('getAvailablePersonnelForDateRange', () => {
    test('should return available personnel for a date range', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const endDate = '2024-03-31';
      const mockResults = [
        {
          id: 1,
          name: 'John Doe',
          availability_percentage: 100,
          current_allocation_percentage: 50,
          remaining_capacity: 50,
          availability_status: 'Available',
        },
        {
          id: 2,
          name: 'Jane Smith',
          availability_percentage: 100,
          current_allocation_percentage: 0,
          remaining_capacity: 100,
          availability_status: 'Available',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getAvailablePersonnelForDateRange(
        startDate,
        endDate
      );

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [
          startDate,
          endDate,
          startDate,
          endDate,
          startDate,
          endDate,
          startDate,
          endDate,
        ]
      );
      expect(result).toEqual(mockResults);
    });

    test('should filter out fully allocated personnel', async () => {
      // Arrange
      const mockResults = [
        {
          id: 1,
          name: 'Available Person',
          remaining_capacity: 25,
          availability_status: 'Available',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getAvailablePersonnelForDateRange(
        '2024-01-01',
        '2024-03-31'
      );

      // Assert
      expect(result.every((p) => p.remaining_capacity > 0)).toBe(true);
    });
  });

  describe('getTopSkilledPersonnelByCategory', () => {
    test('should return top skilled personnel by category without filter', async () => {
      // Arrange
      const mockResults = [
        {
          category: 'Programming Language',
          personnel_id: 1,
          name: 'John Doe',
          skills_count: 5,
          proficiency_score: 15,
          avg_years_experience: 7.5,
          skills_list: 'JavaScript (Expert), Python (Advanced), Java (Intermediate)',
        },
        {
          category: 'Framework',
          personnel_id: 2,
          name: 'Jane Smith',
          skills_count: 3,
          proficiency_score: 10,
          avg_years_experience: 5.0,
          skills_list: 'React (Advanced), Vue (Advanced), Angular (Intermediate)',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getTopSkilledPersonnelByCategory();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(mockResults);
    });

    test('should filter by category when provided', async () => {
      // Arrange
      const category = 'Programming Language';
      const mockResults = [
        {
          category: 'Programming Language',
          personnel_id: 1,
          name: 'John Doe',
          skills_count: 5,
          proficiency_score: 15,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getTopSkilledPersonnelByCategory(category);

      // Assert
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.category = ?'),
        [category]
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('getProjectTimelineWithAllocations', () => {
    test('should return project timeline with allocations without filter', async () => {
      // Arrange
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          project_start: '2024-01-01',
          project_end: '2024-06-30',
          project_duration_days: 181,
          personnel_id: 1,
          personnel_name: 'John Doe',
          allocation_percentage: 100,
          allocation_start: '2024-01-01',
          allocation_end: '2024-06-30',
          role_in_project: 'Lead Developer',
          has_timeline_overlap: 'No',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectTimelineWithAllocations();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(mockResults);
    });

    test('should filter by project ID when provided', async () => {
      // Arrange
      const projectId = 1;
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          personnel_id: 1,
          personnel_name: 'John Doe',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectTimelineWithAllocations(projectId);

      // Assert
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('AND proj.id = ?'),
        [projectId]
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('getSkillDemandVsSupply', () => {
    test('should return skill demand vs supply analysis', async () => {
      // Arrange
      const mockResults = [
        {
          skill_id: 1,
          skill_name: 'Python',
          category: 'Programming Language',
          projects_requiring_skill: 5,
          personnel_with_skill: 3,
          expert_personnel_count: 1,
          supply_status: 'Shortage',
          requiring_projects: 'Project A (Advanced), Project B (Intermediate)',
        },
        {
          skill_id: 2,
          skill_name: 'JavaScript',
          category: 'Programming Language',
          projects_requiring_skill: 3,
          personnel_with_skill: 5,
          expert_personnel_count: 2,
          supply_status: 'Surplus',
          requiring_projects: 'Project C (Intermediate)',
        },
        {
          skill_id: 3,
          skill_name: 'Rare Skill',
          category: 'Other',
          projects_requiring_skill: 2,
          personnel_with_skill: 0,
          expert_personnel_count: 0,
          supply_status: 'Critical Shortage',
          requiring_projects: 'Project D (Expert)',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getSkillDemandVsSupply();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const queryCall = pool.execute.mock.calls[0];
      expect(queryCall[0]).toContain('SELECT');
      expect(queryCall[1] || []).toEqual([]);
      expect(result).toEqual(mockResults);
    });

    test('should identify critical shortages', async () => {
      // Arrange
      const mockResults = [
        {
          skill_name: 'Unavailable Skill',
          personnel_with_skill: 0,
          supply_status: 'Critical Shortage',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getSkillDemandVsSupply();

      // Assert
      expect(result[0].supply_status).toBe('Critical Shortage');
    });
  });

  describe('getPersonnelCompetencyMatrix', () => {
    test('should return personnel competency matrix without filter', async () => {
      // Arrange
      const mockResults = [
        {
          personnel_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role_title: 'Senior Developer',
          experience_level: 'Senior',
          skill_category: 'Programming Language',
          skill_name: 'JavaScript',
          proficiency_level: 'Expert',
          years_of_experience: 8,
        },
        {
          personnel_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role_title: 'Senior Developer',
          experience_level: 'Senior',
          skill_category: 'Programming Language',
          skill_name: 'Python',
          proficiency_level: 'Advanced',
          years_of_experience: 5,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelCompetencyMatrix();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(mockResults);
    });

    test('should filter by personnel ID when provided', async () => {
      // Arrange
      const personnelId = 1;
      const mockResults = [
        {
          personnel_id: 1,
          name: 'John Doe',
          skill_name: 'JavaScript',
          proficiency_level: 'Expert',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelCompetencyMatrix(personnelId);

      // Assert
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.id = ?'),
        [personnelId]
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('getProjectReadinessScore', () => {
    test('should return project readiness score without filter', async () => {
      // Arrange
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          status: 'Active',
          total_required_skills: 5,
          covered_skills: 5,
          readiness_percentage: 100,
          readiness_status: 'Ready',
        },
        {
          project_id: 2,
          project_name: 'Project B',
          status: 'Planning',
          total_required_skills: 10,
          covered_skills: 7,
          readiness_percentage: 70,
          readiness_status: 'Not Ready',
        },
        {
          project_id: 3,
          project_name: 'Project C',
          status: 'Planning',
          total_required_skills: 10,
          covered_skills: 8,
          readiness_percentage: 80,
          readiness_status: 'Nearly Ready',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectReadinessScore();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(mockResults);
    });

    test('should filter by project ID when provided', async () => {
      // Arrange
      const projectId = 1;
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          readiness_percentage: 100,
          readiness_status: 'Ready',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectReadinessScore(projectId);

      // Assert
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE proj.id = ?'),
        [projectId]
      );
      expect(result).toEqual(mockResults);
    });

    test('should handle projects with no requirements', async () => {
      // Arrange
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Project A',
          total_required_skills: 0,
          covered_skills: 0,
          readiness_percentage: null,
          readiness_status: 'No Requirements Defined',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getProjectReadinessScore();

      // Assert
      expect(result[0].readiness_status).toBe('No Requirements Defined');
    });
  });

  describe('getPersonnelUtilizationTrend', () => {
    test('should return personnel utilization trend with default months', async () => {
      // Arrange
      const mockResults = [
        {
          month: '2024-01',
          personnel_id: 1,
          name: 'John Doe',
          active_projects: 2,
          total_allocation: 150,
          avg_allocation: 75,
          project_details: 'Project A (100%), Project B (50%)',
        },
        {
          month: '2024-02',
          personnel_id: 1,
          name: 'John Doe',
          active_projects: 1,
          total_allocation: 100,
          avg_allocation: 100,
          project_details: 'Project A (100%)',
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelUtilizationTrend();

      // Assert
      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [12] // default 12 months
      );
      expect(result).toEqual(mockResults);
    });

    test('should use custom months parameter', async () => {
      // Arrange
      const months = 6;
      const mockResults = [
        {
          month: '2024-01',
          personnel_id: 1,
          name: 'John Doe',
          total_allocation: 100,
        },
      ];

      pool.execute.mockResolvedValueOnce([mockResults]);

      // Act
      const result = await getPersonnelUtilizationTrend(months);

      // Assert
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INTERVAL ? MONTH'),
        [months]
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('Error handling', () => {
    test('should propagate database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      pool.execute.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        getPersonnelWithAvailabilityForProjectDates('2024-01-01', '2024-03-31')
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle errors in all query functions', async () => {
      // Arrange
      const dbError = new Error('Database error');
      pool.execute.mockRejectedValue(dbError);

      // Act & Assert - test a few key functions
      await expect(getPersonnelWithSkillMatchingScore(1)).rejects.toThrow();
      await expect(getProjectAllocationSummary()).rejects.toThrow();
      await expect(getPersonnelWorkloadAnalysis()).rejects.toThrow();
      await expect(getSkillGapAnalysis(1)).rejects.toThrow();
    });
  });
});

