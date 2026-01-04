const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Personnel API', () => {
  let adminToken, managerToken;
  let adminUser, managerUser;
  let testPersonnel, testSkill;

  beforeAll(async () => {
    // Create admin and manager users
    adminUser = await createTestUser({
      email: `personneltest-admin${Date.now()}@example.com`,
      role: 'admin',
      approval_status: 'approved',
    });
    adminToken = generateTestToken(adminUser);

    managerUser = await createTestUser({
      email: `personneltest-manager${Date.now()}@example.com`,
      role: 'manager',
      approval_status: 'approved',
    });
    managerToken = generateTestToken(managerUser);
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestData('personnel', `email LIKE 'personneltest%'`);
    await cleanupTestData('skills', `skill_name LIKE 'PersonnelTest%'`);
    await cleanupTestData('users', `email LIKE 'personneltest%'`);
  });

  afterEach(async () => {
    // Clean up personnel_skills junction table
    if (testPersonnel && testSkill) {
      await cleanupTestData('personnel_skills', `personnel_id = ${testPersonnel.id}`);
    }
  });

  describe('POST /api/personnel', () => {
    it('should create personnel as manager', async () => {
      const personnelData = {
        name: 'PersonnelTest John Doe',
        email: `personneltest${Date.now()}@example.com`,
        role_title: 'Software Engineer',
        experience_level: 'Mid-Level',
        bio: 'Experienced software engineer',
      };

      const response = await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(personnelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(personnelData.name);
      expect(response.body.data.email).toBe(personnelData.email);
      expect(response.body.data.experience_level).toBe(personnelData.experience_level);

      testPersonnel = response.body.data;
    });

    it('should create personnel with skills', async () => {
      // Create a test skill first
      testSkill = await createTestSkill({
        skill_name: `PersonnelTestSkill${Date.now()}`,
        category: 'Programming Language',
      });

      const personnelData = {
        name: 'PersonnelTest Jane Doe',
        email: `personneltest${Date.now()}@example.com`,
        role_title: 'Senior Developer',
        experience_level: 'Senior',
        skills: [
          {
            skill_id: testSkill.id,
            proficiency_level: 'Advanced',
            years_of_experience: 5,
          },
        ],
      };

      const response = await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(personnelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skills).toHaveLength(1);
      expect(response.body.data.skills[0].skill_name).toBe(testSkill.skill_name);

      testPersonnel = response.body.data;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/personnel')
        .send({
          name: 'Test Person',
          email: 'test@example.com',
          role_title: 'Developer',
          experience_level: 'Junior',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Test Person',
          // Missing email, role_title, experience_level
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      // API returns "Validation failed" from express-validator
      expect(response.body.error.message).toMatch(/validation|required/i);
    });

    it('should fail with invalid experience level', async () => {
      const response = await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Test Person',
          email: `personneltest${Date.now()}@example.com`,
          role_title: 'Developer',
          experience_level: 'InvalidLevel',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      // API returns "Validation failed" from express-validator
      expect(response.body.error.message).toMatch(/validation|experience/i);
    });

    it('should fail with duplicate email', async () => {
      const email = `personneltest${Date.now()}@example.com`;

      // Create first personnel
      await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'First Person',
          email,
          role_title: 'Developer',
          experience_level: 'Junior',
        })
        .expect(201);

      // Try to create with same email
      const response = await request(app)
        .post('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Second Person',
          email,
          role_title: 'Developer',
          experience_level: 'Senior',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');
    });
  });

  describe('GET /api/personnel', () => {
    beforeAll(async () => {
      // Create some test personnel
      testPersonnel = await createTestPersonnel({
        name: 'PersonnelTest List User 1',
        email: `personneltest-list1-${Date.now()}@example.com`,
      });
    });

    it('should get all personnel as manager', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get all personnel as admin', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/personnel')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/personnel/:id', () => {
    beforeAll(async () => {
      testPersonnel = await createTestPersonnel({
        name: 'PersonnelTest Get By ID',
        email: `personneltest-getid-${Date.now()}@example.com`,
      });
    });

    it('should get personnel by id', async () => {
      const response = await request(app)
        .get(`/api/personnel/${testPersonnel.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPersonnel.id);
      expect(response.body.data.name).toBe(testPersonnel.name);
    });

    it('should return 404 for non-existent personnel', async () => {
      const response = await request(app)
        .get('/api/personnel/99999')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('PUT /api/personnel/:id', () => {
    beforeEach(async () => {
      testPersonnel = await createTestPersonnel({
        name: 'PersonnelTest Update User',
        email: `personneltest-update-${Date.now()}@example.com`,
      });
    });

    it('should update personnel as manager', async () => {
      const updateData = {
        name: 'Updated Name',
        role_title: 'Lead Developer',
        experience_level: 'Senior',
      };

      const response = await request(app)
        .put(`/api/personnel/${testPersonnel.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.role_title).toBe(updateData.role_title);
      expect(response.body.data.experience_level).toBe(updateData.experience_level);
    });

    it('should return 404 for non-existent personnel', async () => {
      const response = await request(app)
        .put('/api/personnel/99999')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/personnel/:id', () => {
    it('should delete personnel as admin', async () => {
      const personnel = await createTestPersonnel({
        name: 'PersonnelTest Delete User',
        email: `personneltest-delete-${Date.now()}@example.com`,
      });

      const response = await request(app)
        .delete(`/api/personnel/${personnel.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify deletion
      const [rows] = await pool.execute('SELECT * FROM personnel WHERE id = ?', [personnel.id]);
      expect(rows.length).toBe(0);
    });

    it('should fail to delete as manager (forbidden)', async () => {
      const personnel = await createTestPersonnel({
        name: 'PersonnelTest Delete Forbidden',
        email: `personneltest-deleteforbid-${Date.now()}@example.com`,
      });

      const response = await request(app)
        .delete(`/api/personnel/${personnel.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      // API returns "Required role: admin." instead of "admin role required"
      expect(response.body.error.message).toMatch(/admin/i);

      // Cleanup
      await cleanupTestData('personnel', `id = ${personnel.id}`);
    });
  });

  describe('Personnel Skills Management', () => {
    beforeEach(async () => {
      testPersonnel = await createTestPersonnel({
        name: 'PersonnelTest Skills User',
        email: `personneltest-skills-${Date.now()}@example.com`,
      });

      testSkill = await createTestSkill({
        skill_name: `PersonnelTestSkill${Date.now()}`,
        category: 'Framework',
      });
    });

    describe('POST /api/personnel/:id/skills', () => {
      it('should assign skill to personnel', async () => {
        const response = await request(app)
          .post(`/api/personnel/${testPersonnel.id}/skills`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            skill_id: testSkill.id,
            proficiency_level: 'Intermediate',
            years_of_experience: 2.5,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.skill_name).toBe(testSkill.skill_name);
        expect(response.body.data.proficiency_level).toBe('Intermediate');
      });

      it('should fail to assign duplicate skill', async () => {
        // Assign first time
        await request(app)
          .post(`/api/personnel/${testPersonnel.id}/skills`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            skill_id: testSkill.id,
            proficiency_level: 'Beginner',
          })
          .expect(201);

        // Try to assign again
        const response = await request(app)
          .post(`/api/personnel/${testPersonnel.id}/skills`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            skill_id: testSkill.id,
            proficiency_level: 'Advanced',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/personnel/:id/skills', () => {
      beforeEach(async () => {
        // Assign a skill
        await pool.execute(
          'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
          [testPersonnel.id, testSkill.id, 'Advanced', 3]
        );
      });

      it('should get personnel skills', async () => {
        const response = await request(app)
          .get(`/api/personnel/${testPersonnel.id}/skills`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // API returns skills in response.body.skills, not response.body.data
        expect(Array.isArray(response.body.skills)).toBe(true);
        expect(response.body.skills.length).toBeGreaterThan(0);
        expect(response.body.skills[0].skill_name).toBe(testSkill.skill_name);
      });
    });

    describe('PUT /api/personnel/:personnelId/skills/:skillId', () => {
      beforeEach(async () => {
        await pool.execute(
          'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?)',
          [testPersonnel.id, testSkill.id, 'Beginner', 1]
        );
      });

      it('should update skill proficiency', async () => {
        const response = await request(app)
          .put(`/api/personnel/${testPersonnel.id}/skills/${testSkill.id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            proficiency_level: 'Expert',
            years_of_experience: 10,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.proficiency_level).toBe('Expert');
        // MySQL DECIMAL returns as string, so convert or use loose comparison
        expect(Number(response.body.data.years_of_experience)).toBe(10);
      });
    });

    describe('DELETE /api/personnel/:personnelId/skills/:skillId', () => {
      beforeEach(async () => {
        await pool.execute(
          'INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level) VALUES (?, ?, ?)',
          [testPersonnel.id, testSkill.id, 'Intermediate']
        );
      });

      it('should remove skill from personnel', async () => {
        const response = await request(app)
          .delete(`/api/personnel/${testPersonnel.id}/skills/${testSkill.id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // API returns "Skill removed from personnel successfully"
        expect(response.body.message).toMatch(/removed.*successfully/i);

        // Verify deletion
        const [rows] = await pool.execute(
          'SELECT * FROM personnel_skills WHERE personnel_id = ? AND skill_id = ?',
          [testPersonnel.id, testSkill.id]
        );
        expect(rows.length).toBe(0);
      });
    });
  });
});

