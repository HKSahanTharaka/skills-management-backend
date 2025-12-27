/**
 * Permission Rules for Skills Management System
 * 
 * This module defines what each role can do in the system.
 * Follows the principle: ADMIN > MANAGER > USER
 */

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

/**
 * Personnel Permissions
 */
const personnelPermissions = {
  // View permissions
  canViewAllPersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
  
  canViewPersonnelDetail: (user, personnelUserId) => {
    // Admin and Manager can view anyone
    // User can only view own profile
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === personnelUserId;
  },

  // Create permissions
  canCreatePersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdatePersonnel: (user, personnelUserId) => {
    // Admin and Manager can update anyone
    // User can only update own profile
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === personnelUserId;
  },

  // Delete permissions
  canDeletePersonnel: (user) => {
    // Only ADMIN can delete personnel
    return user.role === ROLES.ADMIN;
  },

  // Export permissions
  canExportPersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * Skills Permissions
 */
const skillsPermissions = {
  // View permissions
  canViewSkills: () => {
    // All roles can view skills
    return true;
  },

  // Create permissions
  canCreateSkill: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdateSkill: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Delete permissions
  canDeleteSkill: (user) => {
    // Only ADMIN can delete skills
    return user.role === ROLES.ADMIN;
  },
};

/**
 * Personnel Skills Assignment Permissions
 */
const personnelSkillsPermissions = {
  // Assign skills to someone
  canAssignSkills: (user, targetPersonnelUserId) => {
    // Admin and Manager can assign to anyone
    // User can only assign to self
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === targetPersonnelUserId;
  },

  // Update someone's skill proficiency
  canUpdateSkillProficiency: (user, targetPersonnelUserId) => {
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === targetPersonnelUserId;
  },

  // Remove skills from someone
  canRemoveSkills: (user, targetPersonnelUserId) => {
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === targetPersonnelUserId;
  },
};

/**
 * Projects Permissions
 */
const projectsPermissions = {
  // View permissions
  canViewAllProjects: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewProject: (user, isAssignedToProject) => {
    // Admin and Manager can view all
    // User can only view if assigned
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return isAssignedToProject;
  },

  // Create permissions
  canCreateProject: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdateProject: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Delete permissions
  canDeleteProject: (user) => {
    // Only ADMIN can delete projects
    return user.role === ROLES.ADMIN;
  },

  // Required skills management
  canManageRequiredSkills: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * Matching System Permissions
 */
const matchingPermissions = {
  canUseMatching: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewMatchResults: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canAssignPersonnelToProject: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * Availability Permissions
 */
const availabilityPermissions = {
  // View permissions
  canViewAllAvailability: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewAvailability: (user, personnelUserId) => {
    // Admin and Manager can view anyone's
    // User can only view own
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === personnelUserId;
  },

  // Set/Update permissions
  canSetAvailability: (user, personnelUserId) => {
    // Admin and Manager can set for anyone
    // User can only set for self
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === personnelUserId;
  },

  canUpdateAvailability: (user, availabilityOwnerId) => {
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === availabilityOwnerId;
  },

  // Delete permissions
  canDeleteAvailability: (user, availabilityOwnerId) => {
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === availabilityOwnerId;
  },
};

/**
 * Allocation Permissions
 */
const allocationPermissions = {
  // View permissions
  canViewAllAllocations: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewAllocation: (user, personnelUserId) => {
    // Admin and Manager can view all
    // User can only view own
    if (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) return true;
    return user.id === personnelUserId;
  },

  // Create permissions
  canCreateAllocation: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdateAllocation: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Delete permissions
  canDeleteAllocation: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * User Management Permissions
 */
const userManagementPermissions = {
  canManageUsers: (user) => {
    // Only ADMIN can manage user accounts
    return user.role === ROLES.ADMIN;
  },

  canChangeUserRoles: (user) => {
    return user.role === ROLES.ADMIN;
  },

  canDeleteUsers: (user) => {
    return user.role === ROLES.ADMIN;
  },

  canResetAnyPassword: (user) => {
    return user.role === ROLES.ADMIN;
  },
};

/**
 * Reports & Dashboard Permissions
 */
const reportsPermissions = {
  canViewFullDashboard: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewPersonalDashboard: () => {
    // All roles can view their own dashboard
    return true;
  },

  canExportReports: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewTeamAnalytics: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * System Administration Permissions
 */
const systemPermissions = {
  canAccessSystemSettings: (user) => {
    return user.role === ROLES.ADMIN;
  },

  canViewSystemLogs: (user) => {
    return user.role === ROLES.ADMIN;
  },

  canManageIntegrations: (user) => {
    return user.role === ROLES.ADMIN;
  },
};

/**
 * Helper function to check permission
 */
const checkPermission = (permissionFunction, user, ...args) => {
  if (!user) return false;
  try {
    return permissionFunction(user, ...args);
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

module.exports = {
  ROLES,
  personnelPermissions,
  skillsPermissions,
  personnelSkillsPermissions,
  projectsPermissions,
  matchingPermissions,
  availabilityPermissions,
  allocationPermissions,
  userManagementPermissions,
  reportsPermissions,
  systemPermissions,
  checkPermission,
};

