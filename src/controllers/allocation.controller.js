/**
 * Allocation Controller
 * 
 * This controller handles project allocation tracking.
 * Tracks which projects personnel are assigned to,
 * what percentage of their time is allocated, and when allocations start and end.
 */

const { pool } = require('../config/database');
const { checkAvailabilityConflicts } = require('./availability.controller');

/**
 * Create Project Allocation
 * 
 * Steps:
 * 1. Validate project exists
 * 2. Validate personnel exists
 * 3. Validate date range
 * 4. Check availability conflicts
 * 5. Validate allocation percentage
 * 6. Check total allocations don't exceed 100% for date range
 * 7. Insert into project_allocations
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createProjectAllocation = async (req, res, next) => {
  try {
    const { project_id, personnel_id, allocation_percentage = 100, start_date, end_date, role_in_project } = req.body;

    // Validate required fields
    if (!project_id || !personnel_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: project_id, personnel_id, start_date, and end_date are required'
        }
      });
    }

    // Validate allocation percentage
    if (allocation_percentage < 0 || allocation_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'allocation_percentage must be between 0 and 100'
        }
      });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid start_date format. Use YYYY-MM-DD format'
        }
      });
    }

    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid end_date format. Use YYYY-MM-DD format'
        }
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'end_date must be after start_date'
        }
      });
    }

    // Validate project exists
    const [projects] = await pool.execute(
      'SELECT id, project_name FROM projects WHERE id = ?',
      [project_id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found'
        }
      });
    }

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id, name FROM personnel WHERE id = ?',
      [personnel_id]
    );

    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Check availability conflicts
    const availabilityCheck = await checkAvailabilityConflicts(
      personnel_id,
      start_date,
      end_date,
      allocation_percentage
    );

    if (!availabilityCheck.available) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Personnel is not available for the requested period. Average availability: ${availabilityCheck.averageAvailability}%, Required: ${allocation_percentage}%`,
          conflicts: availabilityCheck.conflicts
        }
      });
    }

    // Check if allocation already exists for this project and personnel
    const [existingAllocations] = await pool.execute(
      `SELECT id FROM project_allocations 
       WHERE project_id = ? 
       AND personnel_id = ? 
       AND start_date <= ? 
       AND end_date >= ?`,
      [project_id, personnel_id, end_date, start_date]
    );

    if (existingAllocations.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Allocation already exists for this project and personnel in the specified date range'
        }
      });
    }

    // Check total allocations don't exceed 100% for overlapping periods
    const [overlappingAllocations] = await pool.execute(
      `SELECT allocation_percentage, start_date, end_date 
       FROM project_allocations 
       WHERE personnel_id = ? 
       AND start_date <= ? 
       AND end_date >= ?`,
      [personnel_id, end_date, start_date]
    );

    // Calculate if adding this allocation would exceed 100%
    // For simplicity, we check if the sum of maximum allocation in any overlapping period exceeds 100%
    let maxTotalAllocation = allocation_percentage;
    
    // Check each overlapping allocation
    for (const allocation of overlappingAllocations) {
      const overlapStart = new Date(Math.max(new Date(start_date), new Date(allocation.start_date)));
      const overlapEnd = new Date(Math.min(new Date(end_date), new Date(allocation.end_date)));
      const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
      
      // Weighted average - for simplicity, use maximum overlap percentage
      if (overlapDays > 0) {
        maxTotalAllocation = Math.max(maxTotalAllocation, allocation.allocation_percentage + allocation_percentage);
      }
    }

    // More precise check: sum allocations for each day
    const allAllocations = [...overlappingAllocations, {
      start_date,
      end_date,
      allocation_percentage
    }];

    // Check daily totals (simplified - check if any day would exceed 100%)
    let exceedsLimit = false;
    for (const alloc of allAllocations) {
      let dailyTotal = alloc.allocation_percentage;
      
      // Check overlap with other allocations
      for (const otherAlloc of allAllocations) {
        if (alloc !== otherAlloc) {
          const overlapStart = new Date(Math.max(new Date(alloc.start_date), new Date(otherAlloc.start_date)));
          const overlapEnd = new Date(Math.min(new Date(alloc.end_date), new Date(otherAlloc.end_date)));
          
          if (overlapStart <= overlapEnd) {
            dailyTotal += otherAlloc.allocation_percentage;
          }
        }
      }
      
      if (dailyTotal > 100) {
        exceedsLimit = true;
        break;
      }
    }

    if (exceedsLimit) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Total allocation would exceed 100%. Current allocations plus requested allocation (${allocation_percentage}%) would exceed capacity.`
        }
      });
    }

    // Insert into project_allocations
    const [result] = await pool.execute(
      'INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES (?, ?, ?, ?, ?, ?)',
      [project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project || null]
    );

    // Fetch the created allocation
    const [createdAllocation] = await pool.execute(
      `SELECT 
        pa.*,
        p.project_name,
        p2.name as personnel_name
      FROM project_allocations pa
      INNER JOIN projects p ON pa.project_id = p.id
      INNER JOIN personnel p2 ON pa.personnel_id = p2.id
      WHERE pa.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Project allocation created successfully',
      data: createdAllocation[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Personnel Utilization
 * 
 * Steps:
 * 1. Validate personnel exists
 * 2. Query all allocations for personnel in date range (optional)
 * 3. Sum allocation percentages for overlapping periods
 * 4. Return utilization percentage and details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getPersonnelUtilization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id, name, role_title FROM personnel WHERE id = ?',
      [id]
    );

    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Build query for allocations
    let query = `SELECT 
      pa.*,
      p.project_name,
      p.status as project_status
    FROM project_allocations pa
    INNER JOIN projects p ON pa.project_id = p.id
    WHERE pa.personnel_id = ?`;
    
    const params = [id];

    // Filter by date range if provided
    if (start_date && end_date) {
      query += ' AND pa.start_date <= ? AND pa.end_date >= ?';
      params.push(end_date, start_date);
    }

    query += ' ORDER BY pa.start_date ASC';

    const [allocations] = await pool.execute(query, params);

    // Calculate utilization percentage
    let utilizationPercentage = 0;
    let totalAllocatedDays = 0;
    let totalDays = 0;

    if (start_date && end_date) {
      totalDays = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calculate weighted average utilization
      let weightedSum = 0;
      
      allocations.forEach(allocation => {
        const periodStart = new Date(Math.max(new Date(start_date), new Date(allocation.start_date)));
        const periodEnd = new Date(Math.min(new Date(end_date), new Date(allocation.end_date)));
        const periodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
        
        weightedSum += periodDays * allocation.allocation_percentage;
        totalAllocatedDays += periodDays;
      });

      if (totalDays > 0) {
        utilizationPercentage = Math.round(weightedSum / totalDays);
      }
    } else {
      // If no date range, calculate based on current and upcoming allocations
      const now = new Date();
      const relevantAllocations = allocations.filter(a => new Date(a.end_date) >= now);
      
      if (relevantAllocations.length > 0) {
        // Find the period covering all relevant allocations
        const minStart = new Date(Math.min(...relevantAllocations.map(a => new Date(a.start_date))));
        const maxEnd = new Date(Math.max(...relevantAllocations.map(a => new Date(a.end_date))));
        totalDays = Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1;
        
        let weightedSum = 0;
        relevantAllocations.forEach(allocation => {
          const periodStart = new Date(allocation.start_date);
          const periodEnd = new Date(allocation.end_date);
          const periodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
          
          weightedSum += periodDays * allocation.allocation_percentage;
          totalAllocatedDays += periodDays;
        });

        if (totalDays > 0) {
          utilizationPercentage = Math.round(weightedSum / totalDays);
        }
      }
    }

    res.status(200).json({
      success: true,
      personnel_id: parseInt(id),
      personnel_name: personnel[0].name,
      role_title: personnel[0].role_title,
      allocations: allocations,
      utilization: {
        percentage: utilizationPercentage,
        total_allocated_days: totalAllocatedDays,
        total_days: totalDays || null,
        available_capacity: 100 - utilizationPercentage
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Project Team
 * 
 * Steps:
 * 1. Validate project exists
 * 2. Query all allocations for project
 * 3. Return assigned personnel with roles
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getProjectTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate project exists
    const [projects] = await pool.execute(
      'SELECT id, project_name FROM projects WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found'
        }
      });
    }

    // Get all allocations for project with personnel details
    const [allocations] = await pool.execute(
      `SELECT 
        pa.id,
        pa.personnel_id,
        p.name as personnel_name,
        p.email as personnel_email,
        p.role_title,
        p.experience_level,
        pa.allocation_percentage,
        pa.start_date,
        pa.end_date,
        pa.role_in_project,
        pa.created_at,
        pa.updated_at
      FROM project_allocations pa
      INNER JOIN personnel p ON pa.personnel_id = p.id
      WHERE pa.project_id = ?
      ORDER BY pa.created_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      project_id: parseInt(id),
      project_name: projects[0].project_name,
      allocations: allocations,
      team_size: allocations.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Project Allocation
 * 
 * Steps:
 * 1. Validate allocation exists
 * 2. Validate dates if changed
 * 3. Validate allocation percentage if changed
 * 4. Check availability conflicts if dates/percentage changed
 * 5. Check total allocations don't exceed 100% (excluding current allocation)
 * 6. Update allocation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateProjectAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allocation_percentage, start_date, end_date, role_in_project } = req.body;

    // Validate allocation exists
    const [existingAllocations] = await pool.execute(
      'SELECT * FROM project_allocations WHERE id = ?',
      [id]
    );

    if (existingAllocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project allocation not found'
        }
      });
    }

    const existing = existingAllocations[0];
    const finalStartDate = start_date || existing.start_date;
    const finalEndDate = end_date || existing.end_date;
    const finalAllocationPercentage = allocation_percentage !== undefined ? allocation_percentage : existing.allocation_percentage;

    // Validate allocation percentage if provided
    if (allocation_percentage !== undefined && (allocation_percentage < 0 || allocation_percentage > 100)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'allocation_percentage must be between 0 and 100'
        }
      });
    }

    // Validate dates if changed
    if (start_date || end_date) {
      const startDateObj = new Date(finalStartDate);
      const endDateObj = new Date(finalEndDate);

      if (start_date && isNaN(startDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid start_date format. Use YYYY-MM-DD format'
          }
        });
      }

      if (end_date && isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid end_date format. Use YYYY-MM-DD format'
          }
        });
      }

      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'end_date must be after start_date'
          }
        });
      }

      // Check availability conflicts (if dates or percentage changed)
      if (start_date || end_date || allocation_percentage !== undefined) {
        const availabilityCheck = await checkAvailabilityConflicts(
          existing.personnel_id,
          finalStartDate,
          finalEndDate,
          finalAllocationPercentage
        );

        if (!availabilityCheck.available) {
          return res.status(409).json({
            success: false,
            error: {
              message: `Personnel is not available for the requested period. Average availability: ${availabilityCheck.averageAvailability}%, Required: ${finalAllocationPercentage}%`,
              conflicts: availabilityCheck.conflicts
            }
          });
        }
      }
    }

    // Check total allocations don't exceed 100% (excluding current allocation)
    if (start_date || end_date || allocation_percentage !== undefined) {
      const [overlappingAllocations] = await pool.execute(
        `SELECT allocation_percentage, start_date, end_date 
         FROM project_allocations 
         WHERE personnel_id = ? 
         AND id != ?
         AND start_date <= ? 
         AND end_date >= ?`,
        [existing.personnel_id, id, finalEndDate, finalStartDate]
      );

      // Simplified check - sum allocations
      let totalAllocation = finalAllocationPercentage;
      for (const allocation of overlappingAllocations) {
        const overlapStart = new Date(Math.max(new Date(finalStartDate), new Date(allocation.start_date)));
        const overlapEnd = new Date(Math.min(new Date(finalEndDate), new Date(allocation.end_date)));
        
        if (overlapStart <= overlapEnd) {
          totalAllocation += allocation.allocation_percentage;
        }
      }

      if (totalAllocation > 100) {
        return res.status(409).json({
          success: false,
          error: {
            message: `Total allocation would exceed 100%. Current allocations plus updated allocation (${finalAllocationPercentage}%) would exceed capacity.`
          }
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (allocation_percentage !== undefined) {
      updateFields.push('allocation_percentage = ?');
      updateParams.push(allocation_percentage);
    }
    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      updateParams.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push('end_date = ?');
      updateParams.push(end_date);
    }
    if (role_in_project !== undefined) {
      updateFields.push('role_in_project = ?');
      updateParams.push(role_in_project);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No fields provided to update'
        }
      });
    }

    updateParams.push(id);

    // Execute update
    await pool.execute(
      `UPDATE project_allocations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Fetch updated allocation
    const [updatedAllocation] = await pool.execute(
      `SELECT 
        pa.*,
        p.project_name,
        p2.name as personnel_name
      FROM project_allocations pa
      INNER JOIN projects p ON pa.project_id = p.id
      INNER JOIN personnel p2 ON pa.personnel_id = p2.id
      WHERE pa.id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Allocation updated successfully',
      data: updatedAllocation[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Project Allocation
 * 
 * Steps:
 * 1. Validate allocation exists
 * 2. Delete from project_allocations
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteProjectAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate allocation exists
    const [existingAllocations] = await pool.execute(
      'SELECT id FROM project_allocations WHERE id = ?',
      [id]
    );

    if (existingAllocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project allocation not found'
        }
      });
    }

    // Delete allocation
    await pool.execute(
      'DELETE FROM project_allocations WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Allocation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Allocations for Personnel
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getPersonnelAllocations = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id, name FROM personnel WHERE id = ?',
      [id]
    );

    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Get all allocations for personnel
    const [allocations] = await pool.execute(
      `SELECT 
        pa.id,
        pa.project_id,
        p.project_name,
        p.status as project_status,
        pa.allocation_percentage,
        pa.start_date,
        pa.end_date,
        pa.role_in_project,
        pa.created_at,
        pa.updated_at
      FROM project_allocations pa
      INNER JOIN projects p ON pa.project_id = p.id
      WHERE pa.personnel_id = ?
      ORDER BY pa.start_date DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      personnel_id: parseInt(id),
      allocations: allocations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProjectAllocation,
  getPersonnelUtilization,
  getProjectTeam,
  updateProjectAllocation,
  deleteProjectAllocation,
  getPersonnelAllocations
};
