/**
 * Project Controller
 *
 * This controller handles all CRUD operations for projects management.
 * Includes validation, database operations, and error handling.
 */

const { pool } = require('../config/database');
const { formatDate } = require('../utils/helpers');

/**
 * Create Project
 *
 * Steps:
 * 1. Validate all required fields (project_name, description, start_date, end_date, status)
 * 2. Validate dates (end_date must be after start_date)
 * 3. Validate status enum
 * 4. Insert into database
 * 5. Return created project
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createProject = async (req, res, next) => {
  try {
    const {
      project_name,
      description,
      start_date,
      end_date,
      status = 'Planning',
      required_skills,
    } = req.body;

    // Validate required fields
    if (!project_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: project_name, start_date, and end_date are required',
        },
      });
    }

    // Validate required_skills
    if (!required_skills || !Array.isArray(required_skills) || required_skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'At least one required skill must be specified',
        },
      });
    }

    // Validate status enum
    const validStatuses = ['Planning', 'Active', 'Completed', 'On Hold'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
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

    // Insert into database
    const [result] = await pool.execute(
      'INSERT INTO projects (project_name, description, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
      [project_name, description || null, start_date, end_date, status]
    );

    // Insert required skills
    if (required_skills && required_skills.length > 0) {
      for (const skill of required_skills) {
        await pool.execute(
          'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
          [result.insertId, skill.skill_id, skill.minimum_proficiency]
        );
      }
    }

    // Fetch the created project with required skills
    const [createdProjects] = await pool.execute(
      `SELECT 
        p.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'skill_id', prs.skill_id,
            'skill_name', s.skill_name,
            'minimum_proficiency', prs.minimum_proficiency
          )
        ) as required_skills
      FROM projects p
      LEFT JOIN project_required_skills prs ON p.id = prs.project_id
      LEFT JOIN skills s ON prs.skill_id = s.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [result.insertId]
    );

    // Format dates to YYYY-MM-DD
    const project = createdProjects[0];
    if (project) {
      project.start_date = formatDate(project.start_date);
      project.end_date = formatDate(project.end_date);
      
      // Parse required_skills JSON
      if (project.required_skills) {
        const skillsData = typeof project.required_skills === 'string' 
          ? JSON.parse(project.required_skills) 
          : project.required_skills;
        
        project.required_skills = Array.isArray(skillsData) 
          ? skillsData.filter(skill => skill && skill.skill_id !== null)
          : [];
      } else {
        project.required_skills = [];
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Projects
 *
 * Supports:
 * - Filtering by status
 * - Date range filtering (start_date, end_date)
 * - Search by project name
 * - Return projects with required skills
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAllProjects = async (req, res, next) => {
  try {
    const { status, search, start_date, end_date, page, limit } = req.query;

    // Build base query
    let query = 'SELECT DISTINCT p.* FROM projects p';
    const conditions = [];
    const params = [];

    // Add status filter
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    // Add search by project name
    if (search) {
      conditions.push('p.project_name LIKE ?');
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
    }

    // Add date range filtering
    if (start_date) {
      conditions.push('p.start_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('p.end_date <= ?');
      params.push(end_date);
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const countQuery = query.replace(
      'SELECT DISTINCT p.*',
      'SELECT COUNT(DISTINCT p.id) as total'
    );
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination
    query += ' ORDER BY p.created_at DESC';

    if (page && limit) {
      const limitValue = parseInt(limit);
      const offsetValue = (parseInt(page) - 1) * limitValue;
      query += ` LIMIT ${limitValue} OFFSET ${offsetValue}`;
    }

    // Execute query
    const [projects] = await pool.execute(query, params);

    // Get required skills for each project
    const projectsWithSkills = await Promise.all(
      projects.map(async (project) => {
        const [requiredSkills] = await pool.execute(
          `SELECT 
            prs.id,
            prs.skill_id,
            s.skill_name,
            s.category,
            prs.minimum_proficiency,
            prs.created_at
          FROM project_required_skills prs
          INNER JOIN skills s ON prs.skill_id = s.id
          WHERE prs.project_id = ?
          ORDER BY prs.created_at DESC`,
          [project.id]
        );

        // Format dates to YYYY-MM-DD
        return {
          ...project,
          start_date: formatDate(project.start_date),
          end_date: formatDate(project.end_date),
          required_skills: requiredSkills,
        };
      })
    );

    // Build response
    const response = {
      success: true,
      data: projectsWithSkills,
    };

    // Add pagination if provided
    if (page && limit) {
      const totalPages = Math.ceil(total / parseInt(limit));
      response.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: totalPages,
      };
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Project
 *
 * Steps:
 * 1. Get project by ID
 * 2. Include required skills (JOIN with project_required_skills and skills)
 * 3. Include allocated personnel (JOIN with project_allocations and personnel)
 * 4. Return 404 if not found
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Query database for project
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    // Return 404 if not found
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
        },
      });
    }

    const project = projects[0];

    // Get required skills (JOIN with project_required_skills and skills)
    const [requiredSkills] = await pool.execute(
      `SELECT 
        prs.id,
        prs.skill_id,
        s.skill_name,
        s.category,
        prs.minimum_proficiency,
        prs.created_at
      FROM project_required_skills prs
      INNER JOIN skills s ON prs.skill_id = s.id
      WHERE prs.project_id = ?
      ORDER BY prs.created_at DESC`,
      [id]
    );

    // Get allocated personnel (JOIN with project_allocations and personnel)
    const [allocatedPersonnel] = await pool.execute(
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

    // Format dates to YYYY-MM-DD and combine project data with required skills and allocated personnel
    const projectData = {
      ...project,
      start_date: formatDate(project.start_date),
      end_date: formatDate(project.end_date),
      required_skills: requiredSkills,
      allocated_personnel: allocatedPersonnel.map((person) => ({
        ...person,
        start_date: formatDate(person.start_date),
        end_date: formatDate(person.end_date),
      })),
    };

    res.status(200).json({
      success: true,
      data: projectData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Project
 *
 * Steps:
 * 1. Validate project exists
 * 2. Validate dates if changed (end_date must be after start_date)
 * 3. Validate status if changed
 * 4. Update fields
 * 5. Return updated project
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_name, description, start_date, end_date, status, required_skills } =
      req.body;

    // Check project exists
    const [existingProjects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (existingProjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
        },
      });
    }

    const existingProject = existingProjects[0];

    // Determine which dates to validate
    const finalStartDate = start_date || existingProject.start_date;
    const finalEndDate = end_date || existingProject.end_date;

    // Validate dates if either is being changed
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
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['Planning', 'Active', 'Completed', 'On Hold'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
      }
    }

    // Build update query dynamically (only update provided fields)
    const updateFields = [];
    const updateParams = [];

    if (project_name !== undefined) {
      updateFields.push('project_name = ?');
      updateParams.push(project_name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      updateParams.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push('end_date = ?');
      updateParams.push(end_date);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No fields provided to update',
        },
      });
    }

    // Add id to params for WHERE clause
    updateParams.push(id);

    // Execute update
    await pool.execute(
      `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Handle required_skills update if provided
    if (required_skills && Array.isArray(required_skills)) {
      // Delete existing required skills
      await pool.execute(
        'DELETE FROM project_required_skills WHERE project_id = ?',
        [id]
      );

      // Insert new required skills
      if (required_skills.length > 0) {
        for (const skill of required_skills) {
          await pool.execute(
            'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
            [id, skill.skill_id, skill.minimum_proficiency]
          );
        }
      }
    }

    // Fetch updated project with required skills
    const [updatedProjects] = await pool.execute(
      `SELECT 
        p.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'skill_id', prs.skill_id,
            'skill_name', s.skill_name,
            'minimum_proficiency', prs.minimum_proficiency
          )
        ) as required_skills
      FROM projects p
      LEFT JOIN project_required_skills prs ON p.id = prs.project_id
      LEFT JOIN skills s ON prs.skill_id = s.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    );

    // Format dates to YYYY-MM-DD
    const project = updatedProjects[0];
    if (project) {
      project.start_date = formatDate(project.start_date);
      project.end_date = formatDate(project.end_date);
      
      // Parse required_skills JSON
      if (project.required_skills) {
        const skillsData = typeof project.required_skills === 'string' 
          ? JSON.parse(project.required_skills) 
          : project.required_skills;
        
        project.required_skills = Array.isArray(skillsData) 
          ? skillsData.filter(skill => skill && skill.skill_id !== null)
          : [];
      } else {
        project.required_skills = [];
      }
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Project
 *
 * Steps:
 * 1. Validate project exists
 * 2. Delete project (CASCADE handles related records)
 * 3. Return success message
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const [existingProjects] = await pool.execute(
      'SELECT id FROM projects WHERE id = ?',
      [id]
    );

    if (existingProjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
        },
      });
    }

    // Delete project (CASCADE handles related records in project_required_skills and project_allocations)
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Required Skill to Project
 *
 * Steps:
 * 1. Validate project exists
 * 2. Validate skill exists
 * 3. Validate minimum_proficiency level
 * 4. Check if skill already required
 * 5. Insert into project_required_skills
 * 6. Return assignment details
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addRequiredSkillToProject = async (req, res, next) => {
  try {
    const { id } = req.params; // project_id
    const { skill_id, minimum_proficiency } = req.body;

    // Validate required fields
    if (!skill_id || !minimum_proficiency) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: skill_id and minimum_proficiency are required',
        },
      });
    }

    // Validate minimum_proficiency enum
    const validProficiencyLevels = [
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ];
    if (!validProficiencyLevels.includes(minimum_proficiency)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid minimum_proficiency. Must be one of: Beginner, Intermediate, Advanced, Expert',
        },
      });
    }

    // Validate project exists
    const [projects] = await pool.execute(
      'SELECT id FROM projects WHERE id = ?',
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

    // Validate skill exists
    const [skills] = await pool.execute(
      'SELECT id, skill_name FROM skills WHERE id = ?',
      [skill_id]
    );

    if (skills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found',
        },
      });
    }

    // Check if skill already required
    const [existingRequirements] = await pool.execute(
      'SELECT id FROM project_required_skills WHERE project_id = ? AND skill_id = ?',
      [id, skill_id]
    );

    if (existingRequirements.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already required for this project',
        },
      });
    }

    // Insert into project_required_skills table
    const [result] = await pool.execute(
      'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
      [id, skill_id, minimum_proficiency]
    );

    // Fetch the created assignment with skill details
    const [assignment] = await pool.execute(
      `SELECT 
        prs.id,
        prs.project_id,
        prs.skill_id,
        s.skill_name,
        s.category,
        prs.minimum_proficiency,
        prs.created_at
      FROM project_required_skills prs
      INNER JOIN skills s ON prs.skill_id = s.id
      WHERE prs.id = ?`,
      [result.insertId]
    );

    // Return assignment details
    res.status(201).json({
      success: true,
      message: 'Required skill added to project successfully',
      data: assignment[0],
    });
  } catch (error) {
    // Handle duplicate assignment error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already required for this project',
        },
      });
    }
    next(error);
  }
};

/**
 * Update Required Skill
 *
 * Steps:
 * 1. Validate assignment exists
 * 2. Validate minimum_proficiency if provided
 * 3. Update minimum proficiency level
 * 4. Return updated assignment
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateRequiredSkill = async (req, res, next) => {
  try {
    const { projectId, skillId } = req.params;
    const { minimum_proficiency } = req.body;

    // Validate required field
    if (!minimum_proficiency) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required field: minimum_proficiency is required',
        },
      });
    }

    // Validate minimum_proficiency enum
    const validProficiencyLevels = [
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ];
    if (!validProficiencyLevels.includes(minimum_proficiency)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid minimum_proficiency. Must be one of: Beginner, Intermediate, Advanced, Expert',
        },
      });
    }

    // Validate assignment exists
    const [existingAssignments] = await pool.execute(
      'SELECT * FROM project_required_skills WHERE project_id = ? AND skill_id = ?',
      [projectId, skillId]
    );

    if (existingAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project required skill assignment not found',
        },
      });
    }

    // Update minimum_proficiency
    await pool.execute(
      'UPDATE project_required_skills SET minimum_proficiency = ? WHERE project_id = ? AND skill_id = ?',
      [minimum_proficiency, projectId, skillId]
    );

    // Fetch updated assignment with skill details
    const [updatedAssignment] = await pool.execute(
      `SELECT 
        prs.id,
        prs.project_id,
        prs.skill_id,
        s.skill_name,
        s.category,
        prs.minimum_proficiency,
        prs.created_at
      FROM project_required_skills prs
      INNER JOIN skills s ON prs.skill_id = s.id
      WHERE prs.project_id = ? AND prs.skill_id = ?`,
      [projectId, skillId]
    );

    res.status(200).json({
      success: true,
      message: 'Required skill updated successfully',
      data: updatedAssignment[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Required Skill
 *
 * Steps:
 * 1. Validate assignment exists
 * 2. Delete from project_required_skills
 * 3. Return success message
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const removeRequiredSkill = async (req, res, next) => {
  try {
    const { projectId, skillId } = req.params;

    // Validate assignment exists
    const [existingAssignments] = await pool.execute(
      'SELECT id FROM project_required_skills WHERE project_id = ? AND skill_id = ?',
      [projectId, skillId]
    );

    if (existingAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project required skill assignment not found',
        },
      });
    }

    // Delete from project_required_skills
    await pool.execute(
      'DELETE FROM project_required_skills WHERE project_id = ? AND skill_id = ?',
      [projectId, skillId]
    );

    res.status(200).json({
      success: true,
      message: 'Required skill removed from project successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addRequiredSkillToProject,
  updateRequiredSkill,
  removeRequiredSkill,
};
