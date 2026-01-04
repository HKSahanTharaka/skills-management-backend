const { pool } = require('../config/database');

const PROFICIENCY_LEVELS = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

const EXPERIENCE_PRIORITY = {
  Junior: 1,
  'Mid-Level': 2,
  Senior: 3,
};

const findMatchingPersonnel = async (req, res, next) => {
  try {
    const project_id = req.params.id;

    const additional_filters = {};
    if (req.query.experience_level) {
      additional_filters.experience_level = req.query.experience_level;
    }
    if (req.query.availability_percentage) {
      additional_filters.availability_percentage = parseInt(
        req.query.availability_percentage
      );
    }

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'project_id is required',
        },
      });
    }

    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [project_id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
        },
      });
    }

    const project = projects[0];

    const [requiredSkills] = await pool.execute(
      `SELECT 
        prs.skill_id,
        s.skill_name,
        prs.minimum_proficiency
      FROM project_required_skills prs
      INNER JOIN skills s ON prs.skill_id = s.id
      WHERE prs.project_id = ?
      ORDER BY s.skill_name`,
      [project_id]
    );

    if (requiredSkills.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Project has no required skills defined',
        },
      });
    }

    let personnelQuery = 'SELECT * FROM personnel WHERE 1=1';
    const personnelParams = [];

    if (additional_filters?.experience_level) {
      personnelQuery += ' AND experience_level = ?';
      personnelParams.push(additional_filters.experience_level);
    }

    const [allPersonnel] = await pool.execute(personnelQuery, personnelParams);

    const personnelIds = allPersonnel.map((p) => p.id);

    let personnelSkillsMap = {};
    if (personnelIds.length > 0) {
      const placeholders = personnelIds.map(() => '?').join(',');
      const [personnelSkills] = await pool.execute(
        `SELECT 
          ps.personnel_id,
          ps.skill_id,
          s.skill_name,
          ps.proficiency_level
        FROM personnel_skills ps
        INNER JOIN skills s ON ps.skill_id = s.id
        WHERE ps.personnel_id IN (${placeholders})`,
        personnelIds
      );

      // Group skills by personnel_id
      personnelSkills.forEach((skill) => {
        if (!personnelSkillsMap[skill.personnel_id]) {
          personnelSkillsMap[skill.personnel_id] = [];
        }
        personnelSkillsMap[skill.personnel_id].push({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          proficiency_level: skill.proficiency_level,
        });
      });
    }

    // Get availability for project date range
    let availabilityMap = {};
    if (personnelIds.length > 0 && project.start_date && project.end_date) {
      const placeholders = personnelIds.map(() => '?').join(',');
      const [availabilityData] = await pool.execute(
        `SELECT 
          personnel_id,
          AVG(availability_percentage) as avg_availability,
          MAX(availability_percentage) as max_availability
        FROM personnel_availability
        WHERE personnel_id IN (${placeholders})
          AND start_date <= ?
          AND end_date >= ?
        GROUP BY personnel_id`,
        [...personnelIds, project.end_date, project.start_date]
      );

      availabilityData.forEach((avail) => {
        availabilityMap[avail.personnel_id] = Math.round(
          avail.avg_availability || 0
        );
      });
    }

    // Calculate matches for each personnel
    const matchedPersonnel = [];

    for (const personnel of allPersonnel) {
      const personnelSkills = personnelSkillsMap[personnel.id] || [];

      // Create a map of personnel skills by skill_id for quick lookup
      const personnelSkillsMapById = {};
      personnelSkills.forEach((skill) => {
        personnelSkillsMapById[skill.skill_id] = skill;
      });

      const matchingSkills = [];
      const missingSkills = [];
      let matchCount = 0;

      for (const requiredSkill of requiredSkills) {
        const personnelSkill = personnelSkillsMapById[requiredSkill.skill_id];

        if (personnelSkill) {
          const requiredLevel =
            PROFICIENCY_LEVELS[requiredSkill.minimum_proficiency];
          const personnelLevel =
            PROFICIENCY_LEVELS[personnelSkill.proficiency_level];

          if (personnelLevel >= requiredLevel) {
            matchCount++;
            matchingSkills.push({
              skillName: requiredSkill.skill_name,
              skillId: requiredSkill.skill_id,
              required: requiredSkill.minimum_proficiency,
              actual: personnelSkill.proficiency_level,
              meets: true,
            });
          } else {
            missingSkills.push({
              skillName: requiredSkill.skill_name,
              skillId: requiredSkill.skill_id,
              required: requiredSkill.minimum_proficiency,
              actual: personnelSkill.proficiency_level,
              meets: false,
            });
          }
        } else {
          missingSkills.push({
            skillName: requiredSkill.skill_name,
            skillId: requiredSkill.skill_id,
            required: requiredSkill.minimum_proficiency,
            actual: null,
            meets: false,
          });
        }
      }

      // Calculate match score
      const matchScore = Math.round((matchCount / requiredSkills.length) * 100);

      // Get availability (default to 100 if no availability data)
      const availability = availabilityMap[personnel.id] ?? 100;

      // Apply availability filter if provided
      if (additional_filters?.availability_percentage !== undefined) {
        if (availability < additional_filters.availability_percentage) {
          continue; // Skip this personnel if they don't meet availability requirement
        }
      }

      if (matchCount > 0) {
        matchedPersonnel.push({
          personnelId: personnel.id,
          name: personnel.name,
          email: personnel.email,
          roleTitle: personnel.role_title,
          experienceLevel: personnel.experience_level,
          profileImageUrl: personnel.profile_image_url,
          matchScore: matchScore,
          matchingSkills: matchingSkills,
          missingSkills: missingSkills,
          availability: availability,
        });
      }
    }

    // Sort results
    matchedPersonnel.sort((a, b) => {
      // Primary: Match score (descending)
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      // Secondary: Experience level (descending - Senior > Mid-Level > Junior)
      const expA = EXPERIENCE_PRIORITY[a.experienceLevel] || 0;
      const expB = EXPERIENCE_PRIORITY[b.experienceLevel] || 0;
      if (expB !== expA) {
        return expB - expA;
      }

      // Tertiary: Availability (descending)
      return b.availability - a.availability;
    });

    const formattedRequiredSkills = requiredSkills.map((rs) => ({
      skillId: rs.skill_id,
      skillName: rs.skill_name,
      minimumProficiency: rs.minimum_proficiency,
    }));

    res.status(200).json({
      success: true,
      projectId: parseInt(project_id),
      projectName: project.project_name,
      requiredSkills: formattedRequiredSkills,
      matchedPersonnel: matchedPersonnel,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findMatchingPersonnel,
};
