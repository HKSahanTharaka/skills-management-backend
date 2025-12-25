/**
 * Personnel Controller
 * 
 * This controller handles all CRUD operations for personnel management.
 * Includes validation, database operations, and error handling.
 */

const { pool } = require('../config/database');

/**
 * Create Personnel
 * 
 * Steps:
 * 1. Validate all required fields (name, email, role_title, experience_level)
 * 2. Check email uniqueness
 * 3. Insert into database
 * 4. Return created personnel with ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createPersonnel = async (req, res, next) => {
  try {
    const { name, email, role_title, experience_level, profile_image_url, bio, user_id } = req.body;

    // Validate required fields
    if (!name || !email || !role_title || !experience_level) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: name, email, role_title, and experience_level are required'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format'
        }
      });
    }

    // Validate experience_level enum
    const validExperienceLevels = ['Junior', 'Mid-Level', 'Senior'];
    if (!validExperienceLevels.includes(experience_level)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid experience_level. Must be one of: Junior, Mid-Level, Senior'
        }
      });
    }

    // Check email uniqueness
    const [existingPersonnel] = await pool.execute(
      'SELECT id FROM personnel WHERE email = ?',
      [email]
    );

    if (existingPersonnel.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });
    }

    // Insert into database
    const [result] = await pool.execute(
      'INSERT INTO personnel (name, email, role_title, experience_level, profile_image_url, bio, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, role_title, experience_level, profile_image_url || null, bio || null, user_id || null]
    );

    // Fetch the created personnel
    const [createdPersonnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [result.insertId]
    );

    // Return created personnel with ID
    res.status(201).json({
      success: true,
      message: 'Personnel created successfully',
      data: createdPersonnel[0]
    });
  } catch (error) {
    // Handle duplicate email error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });
    }
    next(error);
  }
};

/**
 * Get All Personnel
 * 
 * Supports:
 * - Filtering by experience_level, role_title
 * - Search by name or email
 * - Pagination (page, limit)
 * 
 * Query building example:
 * Base query: SELECT * FROM personnel
 * + Filter: WHERE experience_level = 'Senior'
 * + Search: AND (name LIKE '%john%' OR email LIKE '%john%')
 * + Pagination: LIMIT 10 OFFSET 0
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAllPersonnel = async (req, res, next) => {
  try {
    const { experience_level, role_title, search, page = 1, limit = 10 } = req.query;

    // Build base query
    let query = 'SELECT * FROM personnel';
    const conditions = [];
    const params = [];

    // Add filters
    if (experience_level) {
      conditions.push('experience_level = ?');
      params.push(experience_level);
    }

    if (role_title) {
      conditions.push('role_title = ?');
      params.push(role_title);
    }

    // Add search
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    // Execute query
    const [personnel] = await pool.execute(query, params);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / parseInt(limit));

    // Return array of personnel with pagination info
    res.status(200).json({
      success: true,
      data: personnel,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Personnel
 * 
 * Steps:
 * 1. Extract ID from URL parameter
 * 2. Query database for that personnel
 * 3. Include their skills (JOIN with personnel_skills and skills tables)
 * 4. Return 404 if not found
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getPersonnelById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Query database for personnel
    const [personnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    // Return 404 if not found
    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Include their skills (JOIN with personnel_skills and skills tables)
    const [skills] = await pool.execute(
      `SELECT 
        ps.id,
        ps.skill_id,
        s.skill_name,
        s.category,
        ps.proficiency_level,
        ps.years_of_experience,
        ps.created_at as assigned_at
      FROM personnel_skills ps
      INNER JOIN skills s ON ps.skill_id = s.id
      WHERE ps.personnel_id = ?
      ORDER BY ps.created_at DESC`,
      [id]
    );

    // Combine personnel data with skills
    const personnelData = {
      ...personnel[0],
      skills: skills
    };

    res.status(200).json({
      success: true,
      data: personnelData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Personnel
 * 
 * Steps:
 * 1. Validate ID exists
 * 2. Update only provided fields
 * 3. Check email uniqueness if email is being changed
 * 4. Return updated personnel
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updatePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role_title, experience_level, profile_image_url, bio, user_id } = req.body;

    // Validate ID exists
    const [existingPersonnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    if (existingPersonnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Check email uniqueness if email is being changed
    if (email && email !== existingPersonnel[0].email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid email format'
          }
        });
      }

      // Check if new email already exists
      const [emailCheck] = await pool.execute(
        'SELECT id FROM personnel WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailCheck.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already exists'
          }
        });
      }
    }

    // Validate experience_level if provided
    if (experience_level) {
      const validExperienceLevels = ['Junior', 'Mid-Level', 'Senior'];
      if (!validExperienceLevels.includes(experience_level)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid experience_level. Must be one of: Junior, Mid-Level, Senior'
          }
        });
      }
    }

    // Build update query dynamically (only update provided fields)
    const updateFields = [];
    const updateParams = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    if (role_title !== undefined) {
      updateFields.push('role_title = ?');
      updateParams.push(role_title);
    }
    if (experience_level !== undefined) {
      updateFields.push('experience_level = ?');
      updateParams.push(experience_level);
    }
    if (profile_image_url !== undefined) {
      updateFields.push('profile_image_url = ?');
      updateParams.push(profile_image_url);
    }
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateParams.push(bio);
    }
    if (user_id !== undefined) {
      updateFields.push('user_id = ?');
      updateParams.push(user_id);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No fields provided to update'
        }
      });
    }

    // Add id to params for WHERE clause
    updateParams.push(id);

    // Execute update
    await pool.execute(
      `UPDATE personnel SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Fetch updated personnel
    const [updatedPersonnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    // Return updated personnel
    res.status(200).json({
      success: true,
      message: 'Personnel updated successfully',
      data: updatedPersonnel[0]
    });
  } catch (error) {
    // Handle duplicate email error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });
    }
    next(error);
  }
};

/**
 * Delete Personnel
 * 
 * Steps:
 * 1. Validate ID exists
 * 2. Delete from database (CASCADE will handle related records)
 * 3. Return success message
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deletePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID exists
    const [existingPersonnel] = await pool.execute(
      'SELECT id FROM personnel WHERE id = ?',
      [id]
    );

    if (existingPersonnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found'
        }
      });
    }

    // Delete from database (CASCADE will handle related records)
    await pool.execute(
      'DELETE FROM personnel WHERE id = ?',
      [id]
    );

    // Return success message
    res.status(200).json({
      success: true,
      message: 'Personnel deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Personnel Skills
 * 
 * Get all skills assigned to a personnel
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getPersonnelSkills = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id FROM personnel WHERE id = ?',
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

    // Get all skills assigned to this personnel
    const [skills] = await pool.execute(
      `SELECT 
        ps.id,
        ps.skill_id,
        s.skill_name,
        s.category,
        ps.proficiency_level,
        ps.years_of_experience,
        ps.created_at as assigned_at
      FROM personnel_skills ps
      INNER JOIN skills s ON ps.skill_id = s.id
      WHERE ps.personnel_id = ?
      ORDER BY ps.created_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      personnel_id: parseInt(id),
      skills: skills
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Skill to Personnel
 * 
 * Steps:
 * 1. Validate personnel exists
 * 2. Validate skill exists
 * 3. Check if assignment already exists
 * 4. Insert into personnel_skills table
 * 5. Return assignment details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const assignSkillToPersonnel = async (req, res, next) => {
  try {
    const { id } = req.params; // personnel_id
    const { skill_id, proficiency_level, years_of_experience } = req.body;

    // Validate required fields
    if (!skill_id || !proficiency_level) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: skill_id and proficiency_level are required'
        }
      });
    }

    // Validate proficiency_level enum
    const validProficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    if (!validProficiencyLevels.includes(proficiency_level)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid proficiency_level. Must be one of: Beginner, Intermediate, Advanced, Expert'
        }
      });
    }

    // Validate personnel exists
    const [personnel] = await pool.execute(
      'SELECT id FROM personnel WHERE id = ?',
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

    // Validate skill exists
    const [skills] = await pool.execute(
      'SELECT id, skill_name FROM skills WHERE id = ?',
      [skill_id]
    );

    if (skills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    }

    // Check if assignment already exists
    const [existingAssignments] = await pool.execute(
      'SELECT id FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [id, skill_id]
    );

    if (existingAssignments.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already assigned to this personnel'
        }
      });
    }

    // Insert into personnel_skills table
    const [result] = await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [id, skill_id, proficiency_level, years_of_experience || 0]
    );

    // Fetch the created assignment with skill details
    const [assignment] = await pool.execute(
      `SELECT 
        ps.id,
        ps.personnel_id,
        ps.skill_id,
        s.skill_name,
        ps.proficiency_level,
        ps.years_of_experience,
        ps.created_at
      FROM personnel_skills ps
      INNER JOIN skills s ON ps.skill_id = s.id
      WHERE ps.id = ?`,
      [result.insertId]
    );

    // Return assignment details
    res.status(201).json({
      success: true,
      message: 'Skill assigned to personnel successfully',
      data: assignment[0]
    });
  } catch (error) {
    // Handle duplicate assignment error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already assigned to this personnel'
        }
      });
    }
    next(error);
  }
};

/**
 * Update Skill Proficiency
 * 
 * Steps:
 * 1. Validate assignment exists
 * 2. Update proficiency_level
 * 3. Optionally update years_of_experience
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateSkillProficiency = async (req, res, next) => {
  try {
    const { personnelId, skillId } = req.params;
    const { proficiency_level, years_of_experience } = req.body;

    // Validate at least one field is provided
    if (proficiency_level === undefined && years_of_experience === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'At least one field (proficiency_level or years_of_experience) must be provided'
        }
      });
    }

    // Validate proficiency_level enum if provided
    if (proficiency_level !== undefined) {
      const validProficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      if (!validProficiencyLevels.includes(proficiency_level)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid proficiency_level. Must be one of: Beginner, Intermediate, Advanced, Expert'
          }
        });
      }
    }

    // Validate assignment exists
    const [existingAssignments] = await pool.execute(
      'SELECT * FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [personnelId, skillId]
    );

    if (existingAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel skill assignment not found'
        }
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (proficiency_level !== undefined) {
      updateFields.push('proficiency_level = ?');
      updateParams.push(proficiency_level);
    }
    if (years_of_experience !== undefined) {
      updateFields.push('years_of_experience = ?');
      updateParams.push(years_of_experience);
    }

    // Add WHERE clause params
    updateParams.push(personnelId, skillId);

    // Execute update
    await pool.execute(
      `UPDATE personnel_skills SET ${updateFields.join(', ')} WHERE personnel_id = ? AND skill_id = ?`,
      updateParams
    );

    // Fetch updated assignment
    const [updatedAssignment] = await pool.execute(
      `SELECT 
        ps.id,
        ps.personnel_id,
        ps.skill_id,
        ps.proficiency_level,
        ps.years_of_experience,
        ps.updated_at
      FROM personnel_skills ps
      WHERE ps.personnel_id = ? AND ps.skill_id = ?`,
      [personnelId, skillId]
    );

    res.status(200).json({
      success: true,
      message: 'Skill proficiency updated successfully',
      data: updatedAssignment[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Skill from Personnel
 * 
 * Steps:
 * 1. Validate assignment exists
 * 2. Delete from personnel_skills
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const removeSkillFromPersonnel = async (req, res, next) => {
  try {
    const { personnelId, skillId } = req.params;

    // Validate assignment exists
    const [existingAssignments] = await pool.execute(
      'SELECT id FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [personnelId, skillId]
    );

    if (existingAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel skill assignment not found'
        }
      });
    }

    // Delete from personnel_skills
    await pool.execute(
      'DELETE FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [personnelId, skillId]
    );

    res.status(200).json({
      success: true,
      message: 'Skill removed from personnel successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPersonnel,
  getAllPersonnel,
  getPersonnelById,
  updatePersonnel,
  deletePersonnel,
  getPersonnelSkills,
  assignSkillToPersonnel,
  updateSkillProficiency,
  removeSkillFromPersonnel
};
