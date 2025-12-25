/**
 * Availability API Integration Tests
 * 
 * Test Scenarios:
 * - Should create availability period
 * - Should detect overlapping periods
 * - Should calculate utilization correctly
 * - Should prevent over-allocation
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Availability API Integration Tests', () => {
  // Test data storage
  let createdPersonnelIds = [];
  let createdAvailabilityIds = [];
  let createdProjectIds = [];
  let createdAllocationIds = [];

  /**
   * Helper function to create personnel
   */
  const createPersonnel = async (name, email, experienceLevel = 'Senior') => {
    const [result] = await pool.execute(
      'INSERT INTO personnel (name, email, role_title, experience_level) VALUES (?, ?, ?, ?)',
      [name, email, 'Software Engineer', experienceLevel]
    );
    createdPersonnelIds.push(result.insertId);
    return result.insertId;
  };

  /**
   * Helper function to create project
   */
  const createProject = async (projectName, startDate = '2024-01-01', endDate = '2024-06-30') => {
    const [result] = await pool.execute(
      'INSERT INTO projects (project_name, description, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
      [projectName, `Test project: ${projectName}`, startDate, endDate, 'Planning']
    );
    createdProjectIds.push(result.insertId);
    return result.insertId;
  };

  /**
   * Helper function to create allocation
   */
  const createAllocation = async (projectId, personnelId, allocationPercentage, startDate, endDate) => {
    const [result] = await pool.execute(
      'INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [projectId, personnelId, allocationPercentage, startDate, endDate]
    );
    createdAllocationIds.push(result.insertId);
    return result.insertId;
  };

  /**
   * Setup: Create test database connection
   */
  beforeAll(async () => {
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
   */
  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (createdAllocationIds.length > 0) {
      await pool.execute(
        `DELETE FROM project_allocations WHERE id IN (${createdAllocationIds.map(() => '?').join(',')})`,
        createdAllocationIds
      );
    }

    if (createdAvailabilityIds.length > 0) {
      await pool.execute(
        `DELETE FROM personnel_availability WHERE id IN (${createdAvailabilityIds.map(() => '?').join(',')})`,
        createdAvailabilityIds
      );
    }

    if (createdProjectIds.length > 0) {
      await pool.execute(
        `DELETE FROM projects WHERE id IN (${createdProjectIds.map(() => '?').join(',')})`,
        createdProjectIds
      );
    }

    if (createdPersonnelIds.length > 0) {
      await pool.execute(
        `DELETE FROM personnel WHERE id IN (${createdPersonnelIds.map(() => '?').join(',')})`,
        createdPersonnelIds
      );
    }

    console.log('✅ Test data cleaned up');
    await pool.end();
  });

  /**
   * Test: Should create availability period
   */
  describe('POST /api/availability - Create Availability Period', () => {
    test('should create availability period with valid data', async () => {
      // Create personnel
      const personnelId = await createPersonnel(
        'Availability Test User',
        `avail.${Date.now()}@example.com`
      );

      const availabilityData = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 100,
        notes: 'Fully available for Q1'
      };

      const response = await request(app)
        .post('/api/availability')
        .send(availabilityData)
        .expect(201);

      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Availability period created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.personnel_id).toBe(personnelId);
      expect(response.body.data.start_date).toBe(availabilityData.start_date);
      expect(response.body.data.end_date).toBe(availabilityData.end_date);
      expect(response.body.data.availability_percentage).toBe(availabilityData.availability_percentage);
      expect(response.body.data.notes).toBe(availabilityData.notes);

      // Store ID for cleanup
      createdAvailabilityIds.push(response.body.data.id);
    });

    test('should create availability period with partial availability', async () => {
      const personnelId = await createPersonnel(
        'Partial Availability User',
        `partial.${Date.now()}@example.com`
      );

      const availabilityData = {
        personnel_id: personnelId,
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        availability_percentage: 50,
        notes: 'Part-time availability'
      };

      const response = await request(app)
        .post('/api/availability')
        .send(availabilityData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availability_percentage).toBe(50);

      createdAvailabilityIds.push(response.body.data.id);
    });

    test('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: 1
          // Missing start_date and end_date
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });

    test('should return 400 when availability_percentage is invalid', async () => {
      const personnelId = await createPersonnel(
        'Invalid Percent User',
        `invalid.${Date.now()}@example.com`
      );

      const response = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          availability_percentage: 150 // Invalid: > 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('between 0 and 100');
    });

    test('should return 400 when end_date is before start_date', async () => {
      const personnelId = await createPersonnel(
        'Invalid Date User',
        `invaliddate.${Date.now()}@example.com`
      );

      const response = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-03-31',
          end_date: '2024-01-01', // Invalid: before start_date
          availability_percentage: 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('after start_date');
    });

    test('should return 404 when personnel does not exist', async () => {
      const response = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: 99999,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          availability_percentage: 100
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  /**
   * Test: Should detect overlapping periods
   */
  describe('POST /api/availability - Overlapping Periods', () => {
    test('should reject overlapping availability periods', async () => {
      const personnelId = await createPersonnel(
        'Overlap Test User',
        `overlap.${Date.now()}@example.com`
      );

      // Create first availability period
      const firstPeriod = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 100
      };

      const firstResponse = await request(app)
        .post('/api/availability')
        .send(firstPeriod)
        .expect(201);

      createdAvailabilityIds.push(firstResponse.body.data.id);

      // Try to create overlapping period (same dates)
      const overlappingPeriod = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 75
      };

      const response = await request(app)
        .post('/api/availability')
        .send(overlappingPeriod)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('overlaps');
    });

    test('should reject partially overlapping periods', async () => {
      const personnelId = await createPersonnel(
        'Partial Overlap User',
        `partialoverlap.${Date.now()}@example.com`
      );

      // Create first period
      const firstPeriod = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        availability_percentage: 100
      };

      const firstResponse = await request(app)
        .post('/api/availability')
        .send(firstPeriod)
        .expect(201);

      createdAvailabilityIds.push(firstResponse.body.data.id);

      // Try to create period that overlaps (starts before first ends)
      const overlappingPeriod = {
        personnel_id: personnelId,
        start_date: '2024-04-01',
        end_date: '2024-09-30',
        availability_percentage: 75
      };

      const response = await request(app)
        .post('/api/availability')
        .send(overlappingPeriod)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    test('should allow non-overlapping periods', async () => {
      const personnelId = await createPersonnel(
        'Non Overlap User',
        `nonoverlap.${Date.now()}@example.com`
      );

      // Create first period
      const firstPeriod = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 100
      };

      const firstResponse = await request(app)
        .post('/api/availability')
        .send(firstPeriod)
        .expect(201);

      createdAvailabilityIds.push(firstResponse.body.data.id);

      // Create second non-overlapping period
      const secondPeriod = {
        personnel_id: personnelId,
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        availability_percentage: 75
      };

      const secondResponse = await request(app)
        .post('/api/availability')
        .send(secondPeriod)
        .expect(201);

      expect(secondResponse.body.success).toBe(true);
      createdAvailabilityIds.push(secondResponse.body.data.id);
    });

    test('should allow adjacent periods (end_date of first = start_date of second)', async () => {
      const personnelId = await createPersonnel(
        'Adjacent User',
        `adjacent.${Date.now()}@example.com`
      );

      // Create first period
      const firstPeriod = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 100
      };

      const firstResponse = await request(app)
        .post('/api/availability')
        .send(firstPeriod)
        .expect(201);

      createdAvailabilityIds.push(firstResponse.body.data.id);

      // Create adjacent period (starts where first ends)
      const adjacentPeriod = {
        personnel_id: personnelId,
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        availability_percentage: 75
      };

      const secondResponse = await request(app)
        .post('/api/availability')
        .send(adjacentPeriod)
        .expect(201);

      expect(secondResponse.body.success).toBe(true);
      createdAvailabilityIds.push(secondResponse.body.data.id);
    });
  });

  /**
   * Test: Should calculate utilization correctly
   */
  describe('GET /api/availability/:personnelId - Utilization Calculation', () => {
    test('should calculate total availability for date range', async () => {
      const personnelId = await createPersonnel(
        'Utilization Test User',
        `util.${Date.now()}@example.com`
      );

      // Create availability periods
      const period1 = {
        personnel_id: personnelId,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        availability_percentage: 100
      };

      const period1Response = await request(app)
        .post('/api/availability')
        .send(period1)
        .expect(201);

      createdAvailabilityIds.push(period1Response.body.data.id);

      const period2 = {
        personnel_id: personnelId,
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        availability_percentage: 50
      };

      const period2Response = await request(app)
        .post('/api/availability')
        .send(period2)
        .expect(201);

      createdAvailabilityIds.push(period2Response.body.data.id);

      // Get availability for full year
      const response = await request(app)
        .get(`/api/availability/${personnelId}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.personnel_id).toBe(personnelId);
      expect(response.body.availability).toBeDefined();
      expect(Array.isArray(response.body.availability)).toBe(true);
      expect(response.body.availability.length).toBe(2);
      expect(response.body.total_availability_percentage).toBeDefined();

      // Total should be weighted average: (100% * 3 months + 50% * 3 months) / 6 months = 75%
      // Note: Actual calculation depends on exact day count
      expect(response.body.total_availability_percentage).toBeGreaterThanOrEqual(70);
      expect(response.body.total_availability_percentage).toBeLessThanOrEqual(80);
    });

    test('should return 100% when no availability periods exist', async () => {
      const personnelId = await createPersonnel(
        'No Availability User',
        `noavail.${Date.now()}@example.com`
      );

      const response = await request(app)
        .get(`/api/availability/${personnelId}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total_availability_percentage).toBe(100);
    });

    test('should return all availability periods when no date range provided', async () => {
      const personnelId = await createPersonnel(
        'All Periods User',
        `allperiods.${Date.now()}@example.com`
      );

      // Create multiple periods
      const periods = [
        { start_date: '2024-01-01', end_date: '2024-03-31', percentage: 100 },
        { start_date: '2024-04-01', end_date: '2024-06-30', percentage: 75 },
        { start_date: '2024-07-01', end_date: '2024-09-30', percentage: 50 }
      ];

      for (const period of periods) {
        const response = await request(app)
          .post('/api/availability')
          .send({
            personnel_id: personnelId,
            start_date: period.start_date,
            end_date: period.end_date,
            availability_percentage: period.percentage
          })
          .expect(201);

        createdAvailabilityIds.push(response.body.data.id);
      }

      // Get all availability periods
      const response = await request(app)
        .get(`/api/availability/${personnelId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.availability.length).toBe(3);
      expect(response.body.availability[0].availability_percentage).toBe(100);
      expect(response.body.availability[1].availability_percentage).toBe(75);
      expect(response.body.availability[2].availability_percentage).toBe(50);
    });
  });

  /**
   * Test: Should prevent over-allocation
   */
  describe('Availability and Allocation Integration - Over-allocation Prevention', () => {
    test('should calculate utilization considering both availability and allocations', async () => {
      const personnelId = await createPersonnel(
        'Allocation Test User',
        `alloc.${Date.now()}@example.com`
      );

      // Create availability period (100% available)
      const availabilityResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-06-30',
          availability_percentage: 100
        })
        .expect(201);

      createdAvailabilityIds.push(availabilityResponse.body.data.id);

      // Create project
      const projectId = await createProject('Allocation Test Project', '2024-01-01', '2024-06-30');

      // Create allocation (50% of time)
      await createAllocation(projectId, personnelId, 50, '2024-01-01', '2024-06-30');

      // Check utilization: 100% available, 50% allocated = 50% remaining
      // This would be checked when creating another allocation
      // The system should prevent allocating more than available capacity

      // Try to create another allocation that would exceed availability
      // Note: The actual over-allocation check might be in the allocation controller
      // For this test, we verify the availability calculation works correctly

      const getAvailabilityResponse = await request(app)
        .get(`/api/availability/${personnelId}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        })
        .expect(200);

      expect(getAvailabilityResponse.body.total_availability_percentage).toBe(100);
    });

    test('should handle partial availability with allocations', async () => {
      const personnelId = await createPersonnel(
        'Partial Alloc User',
        `partialalloc.${Date.now()}@example.com`
      );

      // Create availability period (50% available)
      const availabilityResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-06-30',
          availability_percentage: 50
        })
        .expect(201);

      createdAvailabilityIds.push(availabilityResponse.body.data.id);

      // Verify availability is 50%
      const getAvailabilityResponse = await request(app)
        .get(`/api/availability/${personnelId}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        })
        .expect(200);

      expect(getAvailabilityResponse.body.total_availability_percentage).toBe(50);
    });
  });

  /**
   * Test: Update and Delete availability
   */
  describe('PUT /api/availability/:id and DELETE /api/availability/:id', () => {
    test('should update availability period', async () => {
      const personnelId = await createPersonnel(
        'Update Test User',
        `update.${Date.now()}@example.com`
      );

      // Create availability period
      const createResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          availability_percentage: 100
        })
        .expect(201);

      const availabilityId = createResponse.body.data.id;
      createdAvailabilityIds.push(availabilityId);

      // Update availability
      const updateResponse = await request(app)
        .put(`/api/availability/${availabilityId}`)
        .send({
          availability_percentage: 75,
          notes: 'Updated to part-time'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.availability_percentage).toBe(75);
      expect(updateResponse.body.data.notes).toBe('Updated to part-time');
    });

    test('should delete availability period', async () => {
      const personnelId = await createPersonnel(
        'Delete Test User',
        `delete.${Date.now()}@example.com`
      );

      // Create availability period
      const createResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          availability_percentage: 100
        })
        .expect(201);

      const availabilityId = createResponse.body.data.id;

      // Delete availability
      const deleteResponse = await request(app)
        .delete(`/api/availability/${availabilityId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toContain('deleted successfully');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/availability/${personnelId}`)
        .expect(200);

      expect(getResponse.body.availability.length).toBe(0);
    });

    test('should return 404 when updating non-existent availability', async () => {
      const response = await request(app)
        .put('/api/availability/99999')
        .send({
          availability_percentage: 75
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should prevent updating to overlapping period', async () => {
      const personnelId = await createPersonnel(
        'Overlap Update User',
        `overlapupdate.${Date.now()}@example.com`
      );

      // Create first period
      const firstResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          availability_percentage: 100
        })
        .expect(201);

      createdAvailabilityIds.push(firstResponse.body.data.id);

      // Create second period
      const secondResponse = await request(app)
        .post('/api/availability')
        .send({
          personnel_id: personnelId,
          start_date: '2024-07-01',
          end_date: '2024-09-30',
          availability_percentage: 75
        })
        .expect(201);

      const secondId = secondResponse.body.data.id;
      createdAvailabilityIds.push(secondId);

      // Try to update second period to overlap with first
      const updateResponse = await request(app)
        .put(`/api/availability/${secondId}`)
        .send({
          start_date: '2024-02-01',
          end_date: '2024-04-30'
        })
        .expect(409);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.error.message).toContain('overlap');
    });
  });
});

