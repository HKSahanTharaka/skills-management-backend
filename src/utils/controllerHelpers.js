const { pool } = require('../config/database');

const getPersonnelUserId = async (personnelId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id FROM personnel WHERE id = ?',
      [personnelId]
    );
    return rows.length > 0 ? rows[0].user_id : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting personnel user_id:', error);
    return null;
  }
};

const canAccessPersonnel = async (user, personnelId) => {
  if (!user) return false;

  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  const personnelUserId = await getPersonnelUserId(personnelId);
  return personnelUserId === user.id;
};

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
    // eslint-disable-next-line no-console
    console.error('Error checking project assignment:', error);
    return false;
  }
};

const getPersonnelIdForUser = async (userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM personnel WHERE user_id = ?',
      [userId]
    );
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    // eslint-disable-next-line no-console
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
