const { pool } = require('../config/database');

/**
 * Get the user_id for a personnel record
 * @param {number} personnelId - Personnel ID
 * @returns {Promise<number|null>} - User ID or null if not found
 */
const getPersonnelUserId = async (personnelId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id FROM personnel WHERE id = ?',
      [personnelId]
    );
    return rows.length > 0 ? rows[0].user_id : null;
  } catch (error) {
    console.error('Error getting personnel user_id:', error);
    return null;
  }
};

/**
 * Check if user can access personnel record
 * Admin & Manager can access anyone, User can only access own
 * @param {Object} user - Current user from req.user
 * @param {number} personnelId - Personnel ID to access
 * @returns {Promise<boolean>}
 */
const canAccessPersonnel = async (user, personnelId) => {
  if (!user) return false;
  
  // Admin and Manager can access anyone
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }
  
  // User can only access own record
  const personnelUserId = await getPersonnelUserId(personnelId);
  return personnelUserId === user.id;
};

/**
 * Check if user is assigned to a project
 * @param {number} userId - User ID
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>}
 */
const isUserAssignedToProject = async (userId, projectId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT pa.id 
       FROM project_allocations pa
       INNER JOIN personnel p ON pa.personnel_id = p.id
       WHERE p.user_id = ? AND pa.project_id = ?`,
      [userId, projectId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking project assignment:', error);
    return false;
  }
};

/**
 * Get personnel_id for a user
 * @param {number} userId - User ID
 * @returns {Promise<number|null>}
 */
const getPersonnelIdForUser = async (userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM personnel WHERE user_id = ?',
      [userId]
    );
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    console.error('Error getting personnel_id for user:', error);
    return null;
  }
};

module.exports = {
  getPersonnelUserId,
  canAccessPersonnel,
  isUserAssignedToProject,
  getPersonnelIdForUser,
};

