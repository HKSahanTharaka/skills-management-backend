const { pool } = require('../config/database');
const { canAccessPersonnel } = require('../utils/controllerHelpers');

const createPersonnel = async (req, res, next) => {
  try {
    const {
      name,
      email,
      role_title,
      experience_level,
      profile_image_url,
      bio,
      user_id,
      skills,
    } = req.body;

    if (!name || !email || !role_title || !experience_level) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: name, email, role_title, and experience_level are required',
        },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
        },
      });
    }

    const validExperienceLevels = ['Junior', 'Mid-Level', 'Senior'];
    if (!validExperienceLevels.includes(experience_level)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid experience_level. Must be one of: Junior, Mid-Level, Senior',
        },
      });
    }

    const [existingPersonnel] = await pool.execute(
      'SELECT id FROM personnel WHERE email = ?',
      [email]
    );

    if (existingPersonnel.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists',
        },
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO personnel (name, email, role_title, experience_level, profile_image_url, bio, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        email,
        role_title,
        experience_level,
        profile_image_url || null,
        bio || null,
        user_id || null,
      ]
    );

    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await pool.execute(
          'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
          [
            result.insertId,
            skill.skill_id,
            skill.proficiency_level,
            skill.years_of_experience || 0,
          ]
        );
      }
    }

    const [createdPersonnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [result.insertId]
    );

    const [personnelSkills] = await pool.execute(
      `SELECT 
        ps.id,
        ps.skill_id,
        s.skill_name,
        s.category,
        ps.proficiency_level,
        ps.years_of_experience
      FROM personnel_skills ps
      INNER JOIN skills s ON ps.skill_id = s.id
      WHERE ps.personnel_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Personnel created successfully',
      data: {
        ...createdPersonnel[0],
        skills: personnelSkills,
      },
    });
  } catch (error) {
    // Handle duplicate email error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists',
        },
      });
    }
    next(error);
  }
};

const getAllPersonnel = async (req, res, next) => {
  try {
    const {
      experience_level,
      role_title,
      search,
      skill_filters,
      page = 1,
      limit = 10,
    } = req.query;

    // Parse skill filters if provided
    let parsedSkillFilters = [];
    if (skill_filters) {
      try {
        parsedSkillFilters = JSON.parse(skill_filters);
      } catch {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid skill_filters format. Must be valid JSON.',
          },
        });
      }
    }

    let query = 'SELECT DISTINCT p.* FROM personnel p';
    const conditions = [];
    const params = [];

    if (parsedSkillFilters.length > 0) {
      parsedSkillFilters.forEach((filter, index) => {
        const alias = `ps${index}`;
        query += ` INNER JOIN personnel_skills ${alias} ON p.id = ${alias}.personnel_id`;
      });
    }

    if (experience_level) {
      conditions.push('p.experience_level = ?');
      params.push(experience_level);
    }

    if (role_title) {
      conditions.push('p.role_title LIKE ?');
      params.push(`%${role_title}%`);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    parsedSkillFilters.forEach((filter, index) => {
      const alias = `ps${index}`;
      const skillConditions = [];

      skillConditions.push(`${alias}.skill_id = ?`);
      params.push(filter.skill_id);

      if (filter.proficiency_level) {
        skillConditions.push(`${alias}.proficiency_level = ?`);
        params.push(filter.proficiency_level);
      }

      if (filter.min_proficiency_level) {
        const proficiencyLevels = [
          'Beginner',
          'Intermediate',
          'Advanced',
          'Expert',
        ];
        const minIndex = proficiencyLevels.indexOf(
          filter.min_proficiency_level
        );

        if (minIndex !== -1) {
          const validLevels = proficiencyLevels.slice(minIndex);
          const placeholders = validLevels.map(() => '?').join(',');
          skillConditions.push(
            `${alias}.proficiency_level IN (${placeholders})`
          );
          params.push(...validLevels);
        }
      }

      if (filter.years_of_experience) {
        skillConditions.push(`${alias}.years_of_experience >= ?`);
        params.push(parseFloat(filter.years_of_experience));
      }

      if (skillConditions.length > 0) {
        conditions.push(`(${skillConditions.join(' AND ')})`);
      }
    });

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const countQuery = query.replace(
      /SELECT DISTINCT p\.\*/i,
      'SELECT COUNT(DISTINCT p.id) as total'
    );
    const [countResult] = await pool.execute(countQuery, [...params]);
    const total = countResult[0].total;

    const limitValue = parseInt(limit, 10);
    const offsetValue = (parseInt(page, 10) - 1) * limitValue;
    query += ` ORDER BY p.created_at DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;

    const [personnel] = await pool.execute(query, params);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: personnel,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPersonnelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if user has permission to view this personnel
    const hasAccess = await canAccessPersonnel(currentUser, id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only view your own profile.',
        },
      });
    }

    const [personnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    // Return 404 if not found
    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found',
        },
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
      skills: skills,
    };

    res.status(200).json({
      success: true,
      data: personnelData,
    });
  } catch (error) {
    next(error);
  }
};

const updatePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const {
      name,
      email,
      role_title,
      experience_level,
      profile_image_url,
      bio,
      user_id,
      skills,
    } = req.body;

    // Check if user has permission to update this personnel
    const hasAccess = await canAccessPersonnel(currentUser, id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only update your own profile.',
        },
      });
    }

    // Validate ID exists
    const [existingPersonnel] = await pool.execute(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    if (existingPersonnel.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Personnel not found',
        },
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
            message: 'Invalid email format',
          },
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
            message: 'Email already exists',
          },
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
            message:
              'Invalid experience_level. Must be one of: Junior, Mid-Level, Senior',
          },
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
          message: 'No fields provided to update',
        },
      });
    }

    // Add id to params for WHERE clause
    updateParams.push(id);

    // Execute update
    await pool.execute(
      `UPDATE personnel SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Handle skills update if provided
    if (skills && Array.isArray(skills)) {
      // Delete existing skills
      await pool.execute(
        'DELETE FROM personnel_skills WHERE personnel_id = ?',
        [id]
      );

      // Insert new skills
      if (skills.length > 0) {
        for (const skill of skills) {
          await pool.execute(
            'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
            [
              id,
              skill.skill_id,
              skill.proficiency_level,
              skill.years_of_experience || 0,
            ]
          );
        }
      }
    }

    // Fetch updated personnel with skills
    const [updatedPersonnel] = await pool.execute(
      `SELECT 
        p.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'skill_id', ps.skill_id,
            'skill_name', s.skill_name,
            'skill_category', s.category,
            'proficiency_level', ps.proficiency_level,
            'years_of_experience', ps.years_of_experience
          )
        ) as skills
      FROM personnel p
      LEFT JOIN personnel_skills ps ON p.id = ps.personnel_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    );

    // Parse skills JSON
    if (updatedPersonnel[0].skills) {
      // Check if skills is already an object or needs parsing
      const skillsData =
        typeof updatedPersonnel[0].skills === 'string'
          ? JSON.parse(updatedPersonnel[0].skills)
          : updatedPersonnel[0].skills;

      updatedPersonnel[0].skills = Array.isArray(skillsData)
        ? skillsData.filter((skill) => skill && skill.skill_id !== null)
        : [];
    } else {
      updatedPersonnel[0].skills = [];
    }

    // Return updated personnel
    res.status(200).json({
      success: true,
      message: 'Personnel updated successfully',
      data: updatedPersonnel[0],
    });
  } catch (error) {
    // Handle duplicate email error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists',
        },
      });
    }
    next(error);
  }
};

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
          message: 'Personnel not found',
        },
      });
    }

    // Delete from database (CASCADE will handle related records)
    await pool.execute('DELETE FROM personnel WHERE id = ?', [id]);

    // Return success message
    res.status(200).json({
      success: true,
      message: 'Personnel deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Personnel not found',
        },
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
      skills: skills,
    });
  } catch (error) {
    next(error);
  }
};

const assignSkillToPersonnel = async (req, res, next) => {
  try {
    const { id } = req.params; // personnel_id
    const { skill_id, proficiency_level, years_of_experience } = req.body;

    // Validate required fields
    if (!skill_id || !proficiency_level) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: skill_id and proficiency_level are required',
        },
      });
    }

    // Validate proficiency_level enum
    const validProficiencyLevels = [
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ];
    if (!validProficiencyLevels.includes(proficiency_level)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid proficiency_level. Must be one of: Beginner, Intermediate, Advanced, Expert',
        },
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
          message: 'Personnel not found',
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

    // Check if assignment already exists
    const [existingAssignments] = await pool.execute(
      'SELECT id FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [id, skill_id]
    );

    if (existingAssignments.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already assigned to this personnel',
        },
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
      data: assignment[0],
    });
  } catch (error) {
    // Handle duplicate assignment error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill is already assigned to this personnel',
        },
      });
    }
    next(error);
  }
};

const updateSkillProficiency = async (req, res, next) => {
  try {
    const { personnelId, skillId } = req.params;
    const { proficiency_level, years_of_experience } = req.body;

    // Validate at least one field is provided
    if (proficiency_level === undefined && years_of_experience === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'At least one field (proficiency_level or years_of_experience) must be provided',
        },
      });
    }

    // Validate proficiency_level enum if provided
    if (proficiency_level !== undefined) {
      const validProficiencyLevels = [
        'Beginner',
        'Intermediate',
        'Advanced',
        'Expert',
      ];
      if (!validProficiencyLevels.includes(proficiency_level)) {
        return res.status(400).json({
          success: false,
          error: {
            message:
              'Invalid proficiency_level. Must be one of: Beginner, Intermediate, Advanced, Expert',
          },
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
          message: 'Personnel skill assignment not found',
        },
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
      data: updatedAssignment[0],
    });
  } catch (error) {
    next(error);
  }
};

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
          message: 'Personnel skill assignment not found',
        },
      });
    }

    // Delete from personnel_skills
    await pool.execute(
      'DELETE FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
      [personnelId, skillId]
    );

    res.status(200).json({
      success: true,
      message: 'Skill removed from personnel successfully',
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
  removeSkillFromPersonnel,
};
