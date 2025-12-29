const { pool } = require('../config/database');

const setPersonnelAvailability = async (req, res, next) => {
  try {
    const {
      personnel_id,
      start_date,
      end_date,
      availability_percentage = 100,
      notes,
    } = req.body;

    // Validate required fields
    if (!personnel_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: personnel_id, start_date, and end_date are required',
        },
      });
    }

    // Validate availability percentage
    if (availability_percentage < 0 || availability_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'availability_percentage must be between 0 and 100',
        },
      });
    }

    // Validate dates format and end_date must be after start_date
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid start_date format. Use YYYY-MM-DD format',
        },
      });
    }

    if (isNaN(endDateObj.getTime())) {
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

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id FROM personnel WHERE id = ?',
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

    // Check for overlapping availability periods
    const [overlapping] = await pool.execute(
      `SELECT id FROM personnel_availability 
       WHERE personnel_id = ? 
       AND start_date <= ? 
       AND end_date >= ?`,
      [personnel_id, end_date, start_date]
    );

    if (overlapping.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message:
            'Availability period overlaps with existing availability periods. Please update or delete the existing period first.',
        },
      });
    }

    // Insert into personnel_availability
    const [result] = await pool.execute(
      'INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage, notes) VALUES (?, ?, ?, ?, ?)',
      [
        personnel_id,
        start_date,
        end_date,
        availability_percentage,
        notes || null,
      ]
    );

    // Fetch the created availability period
    const [createdAvailability] = await pool.execute(
      'SELECT * FROM personnel_availability WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Availability period created successfully',
      data: createdAvailability[0],
    });
  } catch (error) {
    next(error);
  }
};

const getPersonnelAvailability = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { start_date, end_date } = req.query;

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id, name FROM personnel WHERE id = ?',
      [personnelId]
    );

    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found',
        },
      });
    }

    // Build query for availability periods
    let query = 'SELECT * FROM personnel_availability WHERE personnel_id = ?';
    const params = [personnelId];

    // Filter by date range if provided
    if (start_date && end_date) {
      query += ' AND start_date <= ? AND end_date >= ?';
      params.push(end_date, start_date);
    }

    query += ' ORDER BY start_date ASC';

    const [availabilityPeriods] = await pool.execute(query, params);

    // Calculate total availability percentage for date range if provided
    let totalAvailability = null;
    if (start_date && end_date) {
      // Calculate average availability across overlapping periods
      if (availabilityPeriods.length > 0) {
        const totalDays =
          Math.ceil(
            (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
          ) + 1;
        let weightedSum = 0;
        let coveredDays = 0;

        availabilityPeriods.forEach((period) => {
          const periodStart = new Date(
            Math.max(new Date(start_date), new Date(period.start_date))
          );
          const periodEnd = new Date(
            Math.min(new Date(end_date), new Date(period.end_date))
          );
          const periodDays =
            Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;

          weightedSum += periodDays * period.availability_percentage;
          coveredDays += periodDays;
        });

        if (coveredDays > 0) {
          totalAvailability = Math.round(weightedSum / totalDays);
        } else {
          totalAvailability = 100; // Default if no availability periods cover the range
        }
      } else {
        totalAvailability = 100; // Default if no availability periods
      }
    }

    res.status(200).json({
      success: true,
      personnel_id: parseInt(personnelId),
      personnel_name: personnel[0].name,
      availability: availabilityPeriods,
      ...(totalAvailability !== null && {
        total_availability_percentage: totalAvailability,
      }),
    });
  } catch (error) {
    next(error);
  }
};

const updatePersonnelAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, availability_percentage, notes } = req.body;

    // Validate availability period exists
    const [existingAvailability] = await pool.execute(
      'SELECT * FROM personnel_availability WHERE id = ?',
      [id]
    );

    if (existingAvailability.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Availability period not found',
        },
      });
    }

    const existing = existingAvailability[0];
    const finalStartDate = start_date || existing.start_date;
    const finalEndDate = end_date || existing.end_date;

    // Validate availability percentage if provided
    if (
      availability_percentage !== undefined &&
      (availability_percentage < 0 || availability_percentage > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'availability_percentage must be between 0 and 100',
        },
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

      // Check for overlapping periods (excluding current period)
      const [overlapping] = await pool.execute(
        `SELECT id FROM personnel_availability 
         WHERE personnel_id = ? 
         AND id != ?
         AND start_date <= ? 
         AND end_date >= ?`,
        [existing.personnel_id, id, finalEndDate, finalStartDate]
      );

      if (overlapping.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message:
              'Updated availability period would overlap with existing availability periods',
          },
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      updateParams.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push('end_date = ?');
      updateParams.push(end_date);
    }
    if (availability_percentage !== undefined) {
      updateFields.push('availability_percentage = ?');
      updateParams.push(availability_percentage);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
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

    // Execute update
    await pool.execute(
      `UPDATE personnel_availability SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Fetch updated availability period
    const [updatedAvailability] = await pool.execute(
      'SELECT * FROM personnel_availability WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Availability period updated successfully',
      data: updatedAvailability[0],
    });
  } catch (error) {
    next(error);
  }
};

const deletePersonnelAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate availability period exists
    const [existingAvailability] = await pool.execute(
      'SELECT id FROM personnel_availability WHERE id = ?',
      [id]
    );

    if (existingAvailability.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Availability period not found',
        },
      });
    }

    // Delete availability period
    await pool.execute('DELETE FROM personnel_availability WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Availability period deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const checkAvailabilityConflicts = async (
  personnelId,
  startDate,
  endDate,
  requiredPercentage
) => {
  // Get overlapping availability periods
  const [availabilityPeriods] = await pool.execute(
    `SELECT * FROM personnel_availability 
     WHERE personnel_id = ? 
     AND start_date <= ? 
     AND end_date >= ?
     ORDER BY start_date ASC`,
    [personnelId, endDate, startDate]
  );

  // If no availability periods exist, assume 100% available
  if (availabilityPeriods.length === 0) {
    return {
      available: true,
      averageAvailability: 100,
      conflicts: [],
    };
  }

  // Calculate average availability for the date range
  const totalDays =
    Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    ) + 1;
  let weightedSum = 0;
  let coveredDays = 0;
  const conflicts = [];

  availabilityPeriods.forEach((period) => {
    const periodStart = new Date(
      Math.max(new Date(startDate), new Date(period.start_date))
    );
    const periodEnd = new Date(
      Math.min(new Date(endDate), new Date(period.end_date))
    );
    const periodDays =
      Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;

    weightedSum += periodDays * period.availability_percentage;
    coveredDays += periodDays;

    // Check for conflicts where availability is less than required
    if (period.availability_percentage < requiredPercentage) {
      conflicts.push({
        period: {
          id: period.id,
          start_date: period.start_date,
          end_date: period.end_date,
          availability_percentage: period.availability_percentage,
        },
        conflict: `Available only ${period.availability_percentage}% but ${requiredPercentage}% required`,
      });
    }
  });

  const averageAvailability =
    coveredDays > 0 ? Math.round(weightedSum / totalDays) : 100;

  return {
    available: averageAvailability >= requiredPercentage,
    averageAvailability: averageAvailability,
    conflicts: conflicts,
  };
};

module.exports = {
  setPersonnelAvailability,
  getPersonnelAvailability,
  updatePersonnelAvailability,
  deletePersonnelAvailability,
  checkAvailabilityConflicts,
};
