const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Matching Algorithm API', () => {
  let managerToken, adminToken;
  let testProject, testPersonnel1, testPersonnel2, testPersonnel3;
  let skill1, skill2, skill3;

  beforeAll(async () => {
    // Create test users
    const manager = await createTestUser({
      email: `matchtest-manager${Date.now()}@example.com`,
      role: 'manager',
      approval_status: 'approved',
    });
    managerToken = generateTestToken(manager);

    const admin = await createTestUser({
      email: `matchtest-admin${Date.now()}@example.com`,
      role: 'admin',
      approval_status: 'approved',
    });
    adminToken = generateTestToken(admin);

    // Create test skills
    skill1 = await createTestSkill({
      skill_name: `MatchTestJavaScript${Date.now()}`,
      category: 'Programming Language',
    });

    skill2 = await createTestSkill({
      skill_name: `MatchTestReact${Date.now()}`,
      category: 'Framework',
    });

    skill3 = await createTestSkill({
      skill_name: `MatchTestNode${Date.now()}`,
      category: 'Framework',
    });

    // Create test project with required skills
    testProject = await createTestProject({
      project_name: `MatchTest Project ${Date.now()}`,
      start_date: '2025-03-01',
      end_date: '2025-09-01',
      status: 'Planning',
    });

    // Add required skills to project
    await pool.execute(
      'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
      [testProject.id, skill1.id, 'Intermediate']
    );
    await pool.execute(
      'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
      [testProject.id, skill2.id, 'Advanced']
    );
    await pool.execute(
      'INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES (?, ?, ?)',
      [testProject.id, skill3.id, 'Intermediate']
    );

    // Create test personnel with different skill sets
    // Personnel 1: Perfect match (all skills at required level)
    testPersonnel1 = await createTestPersonnel({
      name: 'MatchTest Perfect Match',
      email: `matchtest-perfect${Date.now()}@example.com`,
      role_title: 'Senior Full Stack Developer',
      experience_level: 'Senior',
    });
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel1.id, skill1.id, 'Advanced', 5]
    );
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel1.id, skill2.id, 'Expert', 4]
    );
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel1.id, skill3.id, 'Advanced', 3]
    );

    // Personnel 2: Partial match (2 out of 3 skills)
    testPersonnel2 = await createTestPersonnel({
      name: 'MatchTest Partial Match',
      email: `matchtest-partial${Date.now()}@example.com`,
      role_title: 'Frontend Developer',
      experience_level: 'Mid-Level',
    });
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel2.id, skill1.id, 'Intermediate', 2]
    );
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel2.id, skill2.id, 'Advanced', 3]
    );

    // Personnel 3: Low match (has skills but below required proficiency)
    testPersonnel3 = await createTestPersonnel({
      name: 'MatchTest Low Match',
      email: `matchtest-low${Date.now()}@example.com`,
      role_title: 'Junior Developer',
      experience_level: 'Junior',
    });
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel3.id, skill1.id, 'Beginner', 0.5]
    );
    await pool.execute(
      'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
      [testPersonnel3.id, skill2.id, 'Intermediate', 1]
    );

    // Add availability for personnel
    await pool.execute(
      'INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage) VALUES (?, ?, ?, ?)',
      [testPersonnel1.id, '2025-01-01', '2025-12-31', 100]
    );
    await pool.execute(
      'INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage) VALUES (?, ?, ?, ?)',
      [testPersonnel2.id, '2025-01-01', '2025-12-31', 75]
    );
    await pool.execute(
      'INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage) VALUES (?, ?, ?, ?)',
      [testPersonnel3.id, '2025-01-01', '2025-12-31', 50]
    );
  });

  afterAll(async () => {
    // Cleanup in correct order to respect foreign key constraints
    await cleanupTestData('personnel_availability', `personnel_id IN (${testPersonnel1.id}, ${testPersonnel2.id}, ${testPersonnel3.id})`);
    await cleanupTestData('personnel_skills', `personnel_id IN (${testPersonnel1.id}, ${testPersonnel2.id}, ${testPersonnel3.id})`);
    await cleanupTestData('project_required_skills', `project_id = ${testProject.id}`);
    await cleanupTestData('personnel', `email LIKE 'matchtest%'`);
    await cleanupTestData('projects', `id = ${testProject.id}`);
    await cleanupTestData('skills', `skill_name LIKE 'MatchTest%'`);
    await cleanupTestData('users', `email LIKE 'matchtest%'`);
  });

  describe('GET /api/matching/projects/:id/personnel', () => {
    it('should find matching personnel for project', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.projectId).toBe(testProject.id);
      expect(response.body.projectName).toBe(testProject.project_name);
      expect(Array.isArray(response.body.requiredSkills)).toBe(true);
      expect(response.body.requiredSkills.length).toBe(3);
      expect(Array.isArray(response.body.matchedPersonnel)).toBe(true);
    });

    it('should return personnel sorted by match score (descending)', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const matched = response.body.matchedPersonnel;
      expect(matched.length).toBeGreaterThan(0);

      // Verify sorting: first result should have highest or equal match score
      for (let i = 0; i < matched.length - 1; i++) {
        expect(matched[i].matchScore).toBeGreaterThanOrEqual(matched[i + 1].matchScore);
      }
    });

    it('should include match details (matching and missing skills)', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const matched = response.body.matchedPersonnel;
      expect(matched.length).toBeGreaterThan(0);

      const firstMatch = matched[0];
      expect(firstMatch).toHaveProperty('matchScore');
      expect(firstMatch).toHaveProperty('matchingSkills');
      expect(firstMatch).toHaveProperty('missingSkills');
      expect(firstMatch).toHaveProperty('availability');
      expect(Array.isArray(firstMatch.matchingSkills)).toBe(true);
      expect(Array.isArray(firstMatch.missingSkills)).toBe(true);
    });

    it('should calculate correct match score for perfect match', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const perfectMatch = response.body.matchedPersonnel.find(
        (p) => p.name === 'MatchTest Perfect Match'
      );

      expect(perfectMatch).toBeDefined();
      expect(perfectMatch.matchScore).toBe(100);
      expect(perfectMatch.matchingSkills.length).toBe(3);
      expect(perfectMatch.missingSkills.length).toBe(0);
    });

    it('should calculate correct match score for partial match', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const partialMatch = response.body.matchedPersonnel.find(
        (p) => p.name === 'MatchTest Partial Match'
      );

      expect(partialMatch).toBeDefined();
      // Has 2 out of 3 skills at required level
      expect(partialMatch.matchScore).toBeGreaterThan(50);
      expect(partialMatch.matchScore).toBeLessThan(100);
      expect(partialMatch.matchingSkills.length).toBe(2);
      expect(partialMatch.missingSkills.length).toBe(1);
    });

    it('should include availability percentage for each match', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const perfectMatch = response.body.matchedPersonnel.find(
        (p) => p.name === 'MatchTest Perfect Match'
      );

      expect(perfectMatch).toBeDefined();
      expect(perfectMatch.availability).toBe(100);
    });

    it('should filter by experience level', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel?experience_level=Senior`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const matched = response.body.matchedPersonnel;

      // All returned personnel should be Senior
      matched.forEach((person) => {
        expect(person.experienceLevel).toBe('Senior');
      });
    });

    it('should filter by minimum availability percentage', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel?availability_percentage=80`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const matched = response.body.matchedPersonnel;

      // All returned personnel should have >= 80% availability
      matched.forEach((person) => {
        expect(person.availability).toBeGreaterThanOrEqual(80);
      });
    });

    it('should prioritize experience level when match scores are equal', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const matched = response.body.matchedPersonnel;

      // Check that among equal match scores, Senior comes before Mid-Level and Junior
      for (let i = 0; i < matched.length - 1; i++) {
        if (matched[i].matchScore === matched[i + 1].matchScore) {
          const experiencePriority = { Senior: 3, 'Mid-Level': 2, Junior: 1 };
          const currentPriority = experiencePriority[matched[i].experienceLevel];
          const nextPriority = experiencePriority[matched[i + 1].experienceLevel];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/matching/projects/99999/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 if project has no required skills', async () => {
      // Create project without required skills
      const emptyProject = await createTestProject({
        project_name: `MatchTest Empty Project ${Date.now()}`,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      });

      const response = await request(app)
        .get(`/api/matching/projects/${emptyProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('no required skills');

      await cleanupTestData('projects', `id = ${emptyProject.id}`);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should work for admin users', async () => {
      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle personnel with no availability records (default to 100%)', async () => {
      // Create personnel without availability record
      const noAvailPersonnel = await createTestPersonnel({
        name: 'MatchTest No Availability',
        email: `matchtest-noavail${Date.now()}@example.com`,
        role_title: 'Developer',
        experience_level: 'Mid-Level',
      });

      // Add matching skill
      await pool.execute(
        'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level) VALUES (?, ?, ?)',
        [noAvailPersonnel.id, skill1.id, 'Advanced']
      );

      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const match = response.body.matchedPersonnel.find(
        (p) => p.personnelId === noAvailPersonnel.id
      );

      if (match) {
        expect(match.availability).toBe(100); // Default availability
      }

      // Cleanup
      await cleanupTestData('personnel_skills', `personnel_id = ${noAvailPersonnel.id}`);
      await cleanupTestData('personnel', `id = ${noAvailPersonnel.id}`);
    });

    it('should only return personnel with at least one matching skill', async () => {
      // Create personnel with no matching skills
      const noSkillsPersonnel = await createTestPersonnel({
        name: 'MatchTest No Skills',
        email: `matchtest-noskills${Date.now()}@example.com`,
        role_title: 'Designer',
        experience_level: 'Senior',
      });

      const otherSkill = await createTestSkill({
        skill_name: `MatchTestPhotoshop${Date.now()}`,
        category: 'Tool',
      });

      await pool.execute(
        'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level) VALUES (?, ?, ?)',
        [noSkillsPersonnel.id, otherSkill.id, 'Expert']
      );

      const response = await request(app)
        .get(`/api/matching/projects/${testProject.id}/personnel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const match = response.body.matchedPersonnel.find(
        (p) => p.personnelId === noSkillsPersonnel.id
      );

      expect(match).toBeUndefined(); // Should not be in results

      // Cleanup
      await cleanupTestData('personnel_skills', `personnel_id = ${noSkillsPersonnel.id}`);
      await cleanupTestData('personnel', `id = ${noSkillsPersonnel.id}`);
      await cleanupTestData('skills', `id = ${otherSkill.id}`);
    });
  });
});

