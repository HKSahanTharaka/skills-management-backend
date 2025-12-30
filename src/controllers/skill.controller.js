const { pool } = require('../config/database');

const createSkill = async (req, res, next) => {
  try {
    const { skill_name, category, description } = req.body;

    if (!skill_name || !category) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Missing required fields: skill_name and category are required',
        },
      });
    }

    const validCategories = [
      'Programming Language',
      'Framework',
      'Tool',
      'Soft Skill',
      'Other',
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        },
      });
    }

    const [existingSkills] = await pool.execute(
      'SELECT id FROM skills WHERE skill_name = ?',
      [skill_name]
    );

    if (existingSkills.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists',
        },
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO skills (skill_name, category, description) VALUES (?, ?, ?)',
      [skill_name, category, description || null]
    );

    const [createdSkill] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Skill created successfully',
      data: createdSkill[0],
    });
  } catch (error) {
    // Handle duplicate skill_name error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists',
        },
      });
    }
    next(error);
  }
};

const getAllSkills = async (req, res, next) => {
  try {
    const { category, search, page, limit } = req.query;

    let query = 'SELECT * FROM skills';
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('skill_name LIKE ?');
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (page && limit) {
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      query += ' ORDER BY skill_name ASC';
      const limitValue = parseInt(limit);
      const offsetValue = (parseInt(page) - 1) * limitValue;
      query += ` LIMIT ${limitValue} OFFSET ${offsetValue}`;

      const [skills] = await pool.execute(query, params);

      const totalPages = Math.ceil(total / parseInt(limit));

      res.status(200).json({
        success: true,
        data: skills,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages,
        },
      });
    } else {
      query += ' ORDER BY skill_name ASC';
      const [skills] = await pool.execute(query, params);

      res.status(200).json({
        success: true,
        data: skills,
      });
    }
  } catch (error) {
    next(error);
  }
};

const getSkillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [skills] = await pool.execute('SELECT * FROM skills WHERE id = ?', [
      id,
    ]);

    if (skills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: skills[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { skill_name, category, description } = req.body;

    const [existingSkills] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [id]
    );

    if (existingSkills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found',
        },
      });
    }

    const existingSkill = existingSkills[0];

    if (skill_name && skill_name !== existingSkill.skill_name) {
      const [nameCheck] = await pool.execute(
        'SELECT id FROM skills WHERE skill_name = ? AND id != ?',
        [skill_name, id]
      );

      if (nameCheck.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Skill name already exists',
          },
        });
      }
    }

    if (category) {
      const validCategories = [
        'Programming Language',
        'Framework',
        'Tool',
        'Soft Skill',
        'Other',
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          },
        });
      }
    }

    const updateFields = [];
    const updateParams = [];

    if (skill_name !== undefined) {
      updateFields.push('skill_name = ?');
      updateParams.push(skill_name);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
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

    updateParams.push(id);

    await pool.execute(
      `UPDATE skills SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    const [updatedSkills] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Skill updated successfully',
      data: updatedSkills[0],
    });
  } catch (error) {
    // Handle duplicate skill_name error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists',
        },
      });
    }
    next(error);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existingSkills] = await pool.execute(
      'SELECT id FROM skills WHERE id = ?',
      [id]
    );

    if (existingSkills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found',
        },
      });
    }

    const [personnelSkills] = await pool.execute(
      'SELECT COUNT(*) as count FROM personnel_skills WHERE skill_id = ?',
      [id]
    );

    const usageCount = personnelSkills[0].count;

    if (usageCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Cannot delete skill: It is currently assigned to ${usageCount} personnel. Please remove the skill from all personnel before deleting.`,
        },
      });
    }

    await pool.execute('DELETE FROM skills WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill,
};
