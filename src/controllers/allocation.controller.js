const { pool } = require('../config/database');
const { checkAvailabilityConflicts } = require('./availability.controller');

const createProjectAllocation = async (req, res, next) => {
  try {
    const {
      project_id,
      personnel_id,
      allocation_percentage = 100,
      start_date,
      end_date,
      role_in_project,
    } = req.body;

    if (!project_id || !personnel_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: project_id, personnel_id, start_date, and end_date are required',
        },
      });
    }

    if (allocation_percentage < 0 || allocation_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'allocation_percentage must be between 0 and 100',
        },
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid start date format.',
          hint: 'Please use YYYY-MM-DD format (e.g., 2025-01-15)',
        },
      });
    }

    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid end date format.',
          hint: 'Please use YYYY-MM-DD format (e.g., 2025-12-31)',
        },
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'End date must be after start date.',
          hint: 'The allocation period must span at least one day.',
        },
      });
    }

    const [projects] = await pool.execute(
      'SELECT id, project_name FROM projects WHERE id = ?',
      [project_id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
        },
      });
    }

    const [personnel] = await pool.execute(
      'SELECT id, name FROM personnel WHERE id = ?',
      [personnel_id]
    );

    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found',
        },
      });
    }

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
          message: `Cannot allocate: Personnel availability is ${availabilityCheck.averageAvailability}%, but ${allocation_percentage}% allocation requested.`,
          hint: `The person is only ${availabilityCheck.averageAvailability}% available during this period. Either reduce the allocation percentage or update their availability.`,
          conflicts: availabilityCheck.conflicts,
        },
      });
    }

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
          message:
            'This person is already allocated to this project during the specified dates.',
          hint: 'Check the project team roster or update the existing allocation instead of creating a new one.',
        },
      });
    }

    const [overlappingAllocations] = await pool.execute(
      `SELECT allocation_percentage, start_date, end_date 
       FROM project_allocations 
       WHERE personnel_id = ? 
       AND start_date <= ? 
       AND end_date >= ?`,
      [personnel_id, end_date, start_date]
    );

    if (overlappingAllocations.length > 0) {
      let maxConcurrentAllocation = allocation_percentage;

      for (const existingAlloc of overlappingAllocations) {
        const overlapStart = new Date(
          Math.max(new Date(start_date), new Date(existingAlloc.start_date))
        );
        const overlapEnd = new Date(
          Math.min(new Date(end_date), new Date(existingAlloc.end_date))
        );

        if (overlapStart <= overlapEnd) {
          maxConcurrentAllocation += existingAlloc.allocation_percentage;
        }
      }

      if (maxConcurrentAllocation > 100) {
        return res.status(409).json({
          success: false,
          error: {
            message: `Over-allocation detected: This would result in ${maxConcurrentAllocation}% total allocation (exceeds 100% limit).`,
            hint: `Current allocations: ${maxConcurrentAllocation - allocation_percentage}% + Requested: ${allocation_percentage}% = ${maxConcurrentAllocation}%. Consider reducing allocation percentage or adjusting dates.`,
            details: {
              currentAllocation:
                maxConcurrentAllocation - allocation_percentage,
              requestedAllocation: allocation_percentage,
              totalAllocation: maxConcurrentAllocation,
              maxAllowed: 100,
            },
          },
        });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES (?, ?, ?, ?, ?, ?)',
      [
        project_id,
        personnel_id,
        allocation_percentage,
        start_date,
        end_date,
        role_in_project || null,
      ]
    );

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
      data: createdAllocation[0],
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Personnel not found',
        },
      });
    }

    let query = `SELECT 
      pa.*,
      p.project_name,
      p.status as project_status
    FROM project_allocations pa
    INNER JOIN projects p ON pa.project_id = p.id
    WHERE pa.personnel_id = ?`;

    const params = [id];

    if (start_date && end_date) {
      query += ' AND pa.start_date <= ? AND pa.end_date >= ?';
      params.push(end_date, start_date);
    }

    query += ' ORDER BY pa.start_date ASC';

    const [allocations] = await pool.execute(query, params);

    let utilizationPercentage = 0;
    let totalAllocatedDays = 0;
    let totalDays = 0;

    if (start_date && end_date) {
      totalDays =
        Math.ceil(
          (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
        ) + 1;

      let weightedSum = 0;

      allocations.forEach((allocation) => {
        const periodStart = new Date(
          Math.max(new Date(start_date), new Date(allocation.start_date))
        );
        const periodEnd = new Date(
          Math.min(new Date(end_date), new Date(allocation.end_date))
        );
        const periodDays =
          Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;

        weightedSum += periodDays * allocation.allocation_percentage;
        totalAllocatedDays += periodDays;
      });

      if (totalDays > 0) {
        utilizationPercentage = Math.round(weightedSum / totalDays);
      }
    } else {
      const now = new Date();
      const relevantAllocations = allocations.filter(
        (a) => new Date(a.end_date) >= now
      );

      if (relevantAllocations.length > 0) {
        const minStart = new Date(
          Math.min(...relevantAllocations.map((a) => new Date(a.start_date)))
        );
        const maxEnd = new Date(
          Math.max(...relevantAllocations.map((a) => new Date(a.end_date)))
        );
        totalDays = Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1;

        let weightedSum = 0;
        relevantAllocations.forEach((allocation) => {
          const periodStart = new Date(allocation.start_date);
          const periodEnd = new Date(allocation.end_date);
          const periodDays =
            Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;

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
        available_capacity: 100 - utilizationPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Project not found',
        },
      });
    }

    const [allocations] = await pool.execute(
      `SELECT 
        pa.id,
        pa.project_id,
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
        pa.updated_at,
        proj.project_name
      FROM project_allocations pa
      INNER JOIN personnel p ON pa.personnel_id = p.id
      INNER JOIN projects proj ON pa.project_id = proj.id
      WHERE pa.project_id = ?
      ORDER BY pa.created_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      project_id: parseInt(id),
      project_name: projects[0].project_name,
      allocations: allocations,
      team_size: allocations.length,
    });
  } catch (error) {
    next(error);
  }
};

const updateProjectAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allocation_percentage, start_date, end_date, role_in_project } =
      req.body;

    // Validate allocation exists
    const [existingAllocations] = await pool.execute(
      'SELECT * FROM project_allocations WHERE id = ?',
      [id]
    );

    if (existingAllocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project allocation not found',
        },
      });
    }

    const existing = existingAllocations[0];
    const finalStartDate = start_date || existing.start_date;
    const finalEndDate = end_date || existing.end_date;
    const finalAllocationPercentage =
      allocation_percentage !== undefined
        ? allocation_percentage
        : existing.allocation_percentage;

    if (
      allocation_percentage !== undefined &&
      (allocation_percentage < 0 || allocation_percentage > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'allocation_percentage must be between 0 and 100',
        },
      });
    }

    if (start_date || end_date) {
      const startDateObj = new Date(finalStartDate);
      const endDateObj = new Date(finalEndDate);

      if (start_date && isNaN(startDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid start_date format. Use YYYY-MM-DD format',
          },
        });
      }

      if (end_date && isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid end_date format. Use YYYY-MM-DD format',
          },
        });
      }

      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'end_date must be after start_date',
          },
        });
      }

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
              conflicts: availabilityCheck.conflicts,
            },
          });
        }
      }
    }

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

      let maxConcurrentAllocation = finalAllocationPercentage;

      for (const existingAlloc of overlappingAllocations) {
        const overlapStart = new Date(
          Math.max(new Date(finalStartDate), new Date(existingAlloc.start_date))
        );
        const overlapEnd = new Date(
          Math.min(new Date(finalEndDate), new Date(existingAlloc.end_date))
        );

        if (overlapStart <= overlapEnd) {
          maxConcurrentAllocation += existingAlloc.allocation_percentage;
        }
      }

      if (maxConcurrentAllocation > 100) {
        return res.status(409).json({
          success: false,
          error: {
            message: `Total allocation would exceed 100%. Current allocations (${maxConcurrentAllocation - finalAllocationPercentage}%) plus updated allocation (${finalAllocationPercentage}%) would total ${maxConcurrentAllocation}%.`,
          },
        });
      }
    }

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
          message: 'No fields provided to update',
        },
      });
    }

    updateParams.push(id);

    await pool.execute(
      `UPDATE project_allocations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

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
      data: updatedAllocation[0],
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Project allocation not found',
        },
      });
    }

    await pool.execute('DELETE FROM project_allocations WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Allocation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Personnel not found',
        },
      });
    }

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
      allocations: allocations,
    });
  } catch (error) {
    next(error);
  }
};

const getTeamUtilization = async (req, res, next) => {
  try {
    const { months = 3 } = req.query;

    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(months));

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const [personnelWithAllocations] = await pool.execute(
      `SELECT 
        p.id as personnel_id,
        p.name as personnel_name,
        p.role_title,
        p.experience_level,
        p.profile_image_url,
        pa.project_id,
        pr.project_name,
        pa.allocation_percentage,
        pa.start_date,
        pa.end_date,
        pa.role_in_project
      FROM personnel p
      LEFT JOIN project_allocations pa ON p.id = pa.personnel_id
        AND pa.end_date >= ?
        AND pa.start_date <= ?
      LEFT JOIN projects pr ON pa.project_id = pr.id
      ORDER BY p.name, pa.start_date`,
      [startDateStr, endDateStr]
    );

    const personnelMap = new Map();

    personnelWithAllocations.forEach((row) => {
      if (!personnelMap.has(row.personnel_id)) {
        personnelMap.set(row.personnel_id, {
          personnel_id: row.personnel_id,
          personnel_name: row.personnel_name,
          role_title: row.role_title,
          experience_level: row.experience_level,
          profile_image_url: row.profile_image_url,
          allocations: [],
          total_utilization: 0,
        });
      }

      if (row.project_id) {
        personnelMap.get(row.personnel_id).allocations.push({
          project_id: row.project_id,
          project_name: row.project_name,
          allocation_percentage: row.allocation_percentage,
          start_date: row.start_date,
          end_date: row.end_date,
          role_in_project: row.role_in_project,
        });
      }
    });

    const utilizationData = Array.from(personnelMap.values()).map((person) => {
      if (person.allocations.length === 0) {
        return {
          ...person,
          total_utilization: 0,
          utilization_by_month: generateEmptyMonths(startDateStr, endDateStr),
        };
      }

      const utilizationByMonth = calculateUtilizationByMonth(
        person.allocations,
        startDateStr,
        endDateStr
      );

      const avgUtilization =
        utilizationByMonth.reduce((sum, month) => sum + month.utilization, 0) /
        utilizationByMonth.length;

      return {
        ...person,
        total_utilization: Math.round(avgUtilization),
        utilization_by_month: utilizationByMonth,
      };
    });

    res.status(200).json({
      success: true,
      data: utilizationData,
      date_range: {
        start: startDateStr,
        end: endDateStr,
      },
    });
  } catch (error) {
    next(error);
  }
};

function generateEmptyMonths(startDate, endDate) {
  const months = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    months.push({
      month: current.toISOString().slice(0, 7), // YYYY-MM format
      month_label: current.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      utilization: 0,
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function calculateUtilizationByMonth(allocations, startDate, endDate) {
  const months = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    let monthUtilization = 0;

    allocations.forEach((allocation) => {
      const allocStart = new Date(allocation.start_date);
      const allocEnd = new Date(allocation.end_date);

      if (allocStart <= monthEnd && allocEnd >= monthStart) {
        monthUtilization += allocation.allocation_percentage;
      }
    });

    months.push({
      month: current.toISOString().slice(0, 7), // YYYY-MM format
      month_label: current.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      utilization: Math.min(monthUtilization, 200), // Cap at 200% for display
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

const getAllAllocations = async (req, res, next) => {
  try {
    const { project_id, personnel_id } = req.query;

    let query = `SELECT 
      pa.id,
      pa.project_id,
      pa.personnel_id,
      pa.allocation_percentage,
      pa.start_date,
      pa.end_date,
      pa.role_in_project,
      pa.created_at,
      pa.updated_at,
      proj.project_name,
      p.name as personnel_name
    FROM project_allocations pa
    INNER JOIN projects proj ON pa.project_id = proj.id
    INNER JOIN personnel p ON pa.personnel_id = p.id
    WHERE 1=1`;

    const params = [];

    if (project_id) {
      query += ' AND pa.project_id = ?';
      params.push(project_id);
    }

    if (personnel_id) {
      query += ' AND pa.personnel_id = ?';
      params.push(personnel_id);
    }

    query += ' ORDER BY pa.created_at DESC';

    const [allocations] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: allocations,
    });
  } catch (error) {
    next(error);
  }
};

const getAllocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [allocations] = await pool.execute(
      `SELECT 
        pa.id,
        pa.project_id,
        pa.personnel_id,
        pa.allocation_percentage,
        pa.start_date,
        pa.end_date,
        pa.role_in_project,
        pa.created_at,
        pa.updated_at,
        proj.project_name,
        p.name as personnel_name
      FROM project_allocations pa
      INNER JOIN projects proj ON pa.project_id = proj.id
      INNER JOIN personnel p ON pa.personnel_id = p.id
      WHERE pa.id = ?`,
      [id]
    );

    if (allocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Allocation not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: allocations[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProjectAllocation,
  getAllAllocations,
  getAllocationById,
  getPersonnelUtilization,
  getProjectTeam,
  updateProjectAllocation,
  deleteProjectAllocation,
  getPersonnelAllocations,
  getTeamUtilization,
};
