const { pool } = require('../config/database');

const getAllManagers = async (req, res, next) => {
  try {
    const { approval_status, search, page = 1, limit = 10 } = req.query;

    let whereConditions = 'WHERE u.role = ?';
    const countParams = ['manager'];
    
    const trimmedApprovalStatus = approval_status ? approval_status.trim() : '';
    if (trimmedApprovalStatus !== '' && ['pending', 'approved', 'rejected'].includes(trimmedApprovalStatus)) {
      whereConditions += ' AND u.approval_status = ?';
      countParams.push(trimmedApprovalStatus);
    }

    const trimmedSearch = search ? search.trim() : '';
    if (trimmedSearch !== '') {
      whereConditions += ' AND (u.email LIKE ? OR p.name LIKE ?)';
      const searchPattern = `%${trimmedSearch}%`;
      countParams.push(searchPattern, searchPattern);
    }

    const countQuery = `SELECT COUNT(DISTINCT u.id) as total 
                       FROM users u
                       LEFT JOIN personnel p ON u.id = p.user_id
                       ${whereConditions}`;
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);
    
    let query = `SELECT u.id, u.email, u.role, u.approval_status, u.created_at, u.updated_at,
                        p.id as personnel_id, p.name, p.role_title, p.experience_level, 
                        p.profile_image_url
                 FROM users u
                 LEFT JOIN personnel p ON u.id = p.user_id
                 ${whereConditions}
                 ORDER BY u.created_at DESC LIMIT ${limitValue} OFFSET ${offset}`;

    const [managers] = await pool.execute(query, countParams);

    const formattedManagers = managers.map(manager => ({
      id: manager.id,
      email: manager.email,
      role: manager.role,
      approval_status: manager.approval_status,
      created_at: manager.created_at,
      updated_at: manager.updated_at,
      personnel: manager.personnel_id ? {
        id: manager.personnel_id,
        name: manager.name,
        role_title: manager.role_title,
        experience_level: manager.experience_level,
        profile_image_url: manager.profile_image_url,
      } : null,
    }));

    res.status(200).json({
      success: true,
      data: formattedManagers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getManagerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [managers] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.approval_status, u.created_at, u.updated_at,
              p.id as personnel_id, p.name, p.role_title, p.experience_level, 
              p.profile_image_url, p.bio
       FROM users u
       LEFT JOIN personnel p ON u.id = p.user_id
       WHERE u.id = ? AND u.role = 'manager'`,
      [id]
    );

    if (managers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Manager not found',
        },
      });
    }

    const manager = managers[0];

    res.status(200).json({
      success: true,
      data: {
        id: manager.id,
        email: manager.email,
        role: manager.role,
        approval_status: manager.approval_status,
        created_at: manager.created_at,
        updated_at: manager.updated_at,
        personnel: manager.personnel_id ? {
          id: manager.personnel_id,
          name: manager.name,
          role_title: manager.role_title,
          experience_level: manager.experience_level,
          profile_image_url: manager.profile_image_url,
          bio: manager.bio,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const approveManager = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [managers] = await pool.execute(
      'SELECT id, email, role, approval_status FROM users WHERE id = ? AND role = "manager"',
      [id]
    );

    if (managers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Manager not found',
        },
      });
    }

    const manager = managers[0];

    if (manager.approval_status === 'approved') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Manager is already approved',
        },
      });
    }

    await pool.execute(
      'UPDATE users SET approval_status = "approved" WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Manager approved successfully',
      data: {
        id: manager.id,
        email: manager.email,
        approval_status: 'approved',
      },
    });
  } catch (error) {
    next(error);
  }
};

const rejectManager = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [managers] = await pool.execute(
      'SELECT id, email, role, approval_status FROM users WHERE id = ? AND role = "manager"',
      [id]
    );

    if (managers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Manager not found',
        },
      });
    }

    const manager = managers[0];

    if (manager.approval_status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Manager is already rejected',
        },
      });
    }

    await pool.execute(
      'UPDATE users SET approval_status = "rejected" WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Manager rejected successfully',
      data: {
        id: manager.id,
        email: manager.email,
        approval_status: 'rejected',
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteManager = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [managers] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = "manager"',
      [id]
    );

    if (managers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Manager not found',
        },
      });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Manager deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getManagerStats = async (req, res, next) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM users
      WHERE role = 'manager'
    `);

    res.status(200).json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllManagers,
  getManagerById,
  approveManager,
  rejectManager,
  deleteManager,
  getManagerStats,
};

