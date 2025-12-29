/**
 * Permission Rules for Skills Management System
 * 
 * Role Hierarchy and Access Control:
 * 
 * ADMIN (System Administrator):
 * - Full system access and control
 * - User management (create, delete, change roles)
 * - Delete any resource (personnel, skills, projects)
 * - System settings and logs
 * - All manager permissions
 * 
 * MANAGER (Operations Manager):
 * - Create, view, and update resources
 * - Manage day-to-day operations
 * - Cannot delete critical resources
 * - Cannot manage user accounts
 * - Cannot access system administration
 */

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
};

/**
 * Personnel Permissions
 * Both admin and manager have full access
 */
const personnelPermissions = {
  // View permissions
  canViewAllPersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
  
  canViewPersonnelDetail: (user) => {
    // Both admin and manager can view anyone
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Create permissions
  canCreatePersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdatePersonnel: (user) => {
    // Both admin and manager can update anyone
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
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
 * Both admin and manager have full access
 */
const skillsPermissions = {
  // View permissions
  canViewSkills: () => {
    // All authenticated users can view skills
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
 * Both admin and manager have full access
 */
const personnelSkillsPermissions = {
  // Assign skills to someone
  canAssignSkills: (user) => {
    // Both admin and manager can assign to anyone
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update someone's skill proficiency
  canUpdateSkillProficiency: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Remove skills from someone
  canRemoveSkills: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * Projects Permissions
 * Both admin and manager have full access
 */
const projectsPermissions = {
  // View permissions
  canViewAllProjects: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewProject: (user) => {
    // Both admin and manager can view all
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
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
 * Both admin and manager have full access
 */
const availabilityPermissions = {
  // View permissions
  canViewAllAvailability: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewAvailability: (user) => {
    // Both admin and manager can view anyone's
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Set/Update permissions
  canSetAvailability: (user) => {
    // Both admin and manager can set for anyone
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canUpdateAvailability: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Delete permissions
  canDeleteAvailability: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

/**
 * Allocation Permissions
 * Both admin and manager have full access
 */
const allocationPermissions = {
  // View permissions
  canViewAllAllocations: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewAllocation: (user) => {
    // Both admin and manager can view all
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
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
 * Only ADMIN can manage user accounts
 */
const userManagementPermissions = {
  canManageUsers: (user) => {
    // Only ADMIN can manage user accounts
    return user.role === ROLES.ADMIN;
  },

  canChangeUserRoles: (user) => {
    // Only ADMIN can change user roles
    return user.role === ROLES.ADMIN;
  },

  canDeleteUsers: (user) => {
    // Only ADMIN can delete users
    return user.role === ROLES.ADMIN;
  },

  canResetAnyPassword: (user) => {
    // Only ADMIN can reset passwords
    return user.role === ROLES.ADMIN;
  },
};

/**
 * Reports & Dashboard Permissions
 * Both admin and manager have full access
 */
const reportsPermissions = {
  canViewFullDashboard: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewPersonalDashboard: (user) => {
    // All authenticated users can view their own dashboard
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
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
 * Only ADMIN has system-level access
 */
const systemPermissions = {
  canAccessSystemSettings: (user) => {
    // Only ADMIN can access system settings
    return user.role === ROLES.ADMIN;
  },

  canViewSystemLogs: (user) => {
    // Only ADMIN can view system logs
    return user.role === ROLES.ADMIN;
  },

  canManageIntegrations: (user) => {
    // Only ADMIN can manage integrations
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

