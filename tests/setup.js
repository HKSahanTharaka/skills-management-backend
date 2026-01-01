// Test setup and teardown
const { pool, testConnection } = require('../src/config/database');

// Set test environment
process.env.NODE_ENV = 'test';

// Global setup before all tests
beforeAll(async () => {
  // Test database connection
  await testConnection();
});

// Global teardown after all tests
afterAll(async () => {
  // Close database connections
  if (pool) {
    await pool.end();
  }
});

// Helper to clean up test data
global.cleanupTestData = async (tableName, condition = '1=1') => {
  try {
    await pool.execute(`DELETE FROM ${tableName} WHERE ${condition}`);
  } catch (error) {
    console.error(`Error cleaning up ${tableName}:`, error.message);
  }
};

// Helper to create test user
global.createTestUser = async (userData = {}) => {
  const bcrypt = require('bcryptjs');
  const defaultData = {
    email: `test${Date.now()}@example.com`,
    password: await bcrypt.hash('password123', 10),
    role: 'manager',
    approval_status: 'approved',
    ...userData,
  };

  const [result] = await pool.execute(
    'INSERT INTO users (email, password, role, approval_status) VALUES (?, ?, ?, ?)',
    [defaultData.email, defaultData.password, defaultData.role, defaultData.approval_status]
  );

  return {
    id: result.insertId,
    email: defaultData.email,
    role: defaultData.role,
    approval_status: defaultData.approval_status,
  };
};

// Helper to generate JWT token
global.generateTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be set for tests');
  }
  
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      approval_status: user.approval_status,
    },
    secret,
    { expiresIn: '1h' }
  );
};

// Helper to create test skill
global.createTestSkill = async (skillData = {}) => {
  const defaultData = {
    skill_name: `Test Skill ${Date.now()}`,
    category: 'Programming Language',
    description: 'Test skill description',
    ...skillData,
  };

  const [result] = await pool.execute(
    'INSERT INTO skills (skill_name, category, description) VALUES (?, ?, ?)',
    [defaultData.skill_name, defaultData.category, defaultData.description]
  );

  return {
    id: result.insertId,
    ...defaultData,
  };
};

// Helper to create test personnel
global.createTestPersonnel = async (personnelData = {}) => {
  const defaultData = {
    name: `Test Person ${Date.now()}`,
    email: `testperson${Date.now()}@example.com`,
    role_title: 'Software Developer',
    experience_level: 'Mid-Level',
    ...personnelData,
  };

  const [result] = await pool.execute(
    'INSERT INTO personnel (name, email, role_title, experience_level, bio, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [
      defaultData.name,
      defaultData.email,
      defaultData.role_title,
      defaultData.experience_level,
      defaultData.bio || null,
      defaultData.user_id || null,
    ]
  );

  return {
    id: result.insertId,
    ...defaultData,
  };
};

// Helper to create test project
global.createTestProject = async (projectData = {}) => {
  const defaultData = {
    project_name: `Test Project ${Date.now()}`,
    description: 'Test project description',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'Planning',
    ...projectData,
  };

  const [result] = await pool.execute(
    'INSERT INTO projects (project_name, description, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
    [
      defaultData.project_name,
      defaultData.description,
      defaultData.start_date,
      defaultData.end_date,
      defaultData.status,
    ]
  );

  return {
    id: result.insertId,
    ...defaultData,
  };
};

