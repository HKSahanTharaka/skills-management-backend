const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
};

const personnelPermissions = {
  // View permissions
  canViewAllPersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewPersonnelDetail: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Create permissions
  canCreatePersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Update permissions
  canUpdatePersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  // Delete permissions - Only ADMIN
  canDeletePersonnel: (user) => {
    return user.role === ROLES.ADMIN;
  },

  // Export permissions
  canExportPersonnel: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

const skillsPermissions = {
  // View permissions
  canViewSkills: () => {
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

  // Delete permissions - Only ADMIN
  canDeleteSkill: (user) => {
    return user.role === ROLES.ADMIN;
  },
};

const personnelSkillsPermissions = {
  canAssignSkills: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canUpdateSkillProficiency: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canRemoveSkills: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

const projectsPermissions = {
  // View permissions
  canViewAllProjects: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },

  canViewProject: (user) => {
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

  // Delete permissions - Only ADMIN
  canDeleteProject: (user) => {
    return user.role === ROLES.ADMIN;
  },

  canManageRequiredSkills: (user) => {
    return user.role === ROLES.ADMIN || user.role === ROLES.MANAGER;
  },
};

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
    // Only ADMIN can delete availability periods
    return user.role === ROLES.ADMIN;
  },
};

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

const checkPermission = (permissionFunction, user, ...args) => {
  if (!user) return false;
  try {
    return permissionFunction(user, ...args);
  } catch (error) {
    // eslint-disable-next-line no-console
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
