/**
 * Complex Queries Module
 * 
 * This module contains complex SQL queries for advanced operations
 * in the Skills Management System. These queries can be used directly
 * in controllers or services.
 * 
 * All queries use parameterized statements to prevent SQL injection.
 */

const { pool } = require('../config/database');

/**
 * 1. Get Personnel with Availability for Project Dates
 * 
 * Retrieves all personnel with their availability percentage
 * for a specific project's date range. If no availability record exists,
 * defaults to 100% availability.
 * 
 * @param {string} projectStartDate - Project start date (YYYY-MM-DD)
 * @param {string} projectEndDate - Project end date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of personnel with availability data
 */
const getPersonnelWithAvailabilityForProjectDates = async (projectStartDate, projectEndDate) => {
  const query = `
    SELECT 
      p.*,
      COALESCE(
        (SELECT AVG(availability_percentage)
         FROM personnel_availability 
         WHERE personnel_id = p.id 
         AND start_date <= ?
         AND end_date >= ?),
        100
      ) as availability_percentage,
      COALESCE(
        (SELECT GROUP_CONCAT(notes SEPARATOR '; ')
         FROM personnel_availability 
         WHERE personnel_id = p.id 
         AND start_date <= ?
         AND end_date >= ?
         LIMIT 1),
        'No availability record'
      ) as availability_notes
    FROM personnel p
    ORDER BY p.name
  `;
  
  const [results] = await pool.execute(query, [
    projectEndDate,
    projectStartDate,
    projectEndDate,
    projectStartDate
  ]);
  
  return results;
};

/**
 * 2. Get Personnel with Skill Matching Score for Project
 * 
 * Returns personnel with their skill matching score based on project requirements.
 * Calculates how many required skills each personnel has and their proficiency match status.
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Array of personnel with matching scores
 */
const getPersonnelWithSkillMatchingScore = async (projectId) => {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.email,
      p.role_title,
      p.experience_level,
      COUNT(DISTINCT prs.skill_id) as total_required_skills,
      COUNT(DISTINCT ps.skill_id) as matching_skills_count,
      ROUND(
        (COUNT(DISTINCT CASE 
          WHEN ps.proficiency_level IN ('Advanced', 'Expert') 
          OR (ps.proficiency_level = prs.minimum_proficiency 
              AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
          THEN ps.skill_id 
        END) * 100.0 / NULLIF(COUNT(DISTINCT prs.skill_id), 0)), 
        2
      ) as match_percentage,
      GROUP_CONCAT(DISTINCT s.skill_name SEPARATOR ', ') as matching_skills
    FROM personnel p
    CROSS JOIN projects proj
    INNER JOIN project_required_skills prs ON prs.project_id = proj.id
    LEFT JOIN personnel_skills ps ON ps.personnel_id = p.id AND ps.skill_id = prs.skill_id
    LEFT JOIN skills s ON s.id = ps.skill_id
    WHERE proj.id = ?
    GROUP BY p.id, p.name, p.email, p.role_title, p.experience_level
    HAVING matching_skills_count > 0
    ORDER BY match_percentage DESC, p.experience_level DESC
  `;
  
  const [results] = await pool.execute(query, [projectId]);
  return results;
};

/**
 * 3. Get Project Allocation Summary with Utilization
 * 
 * Shows all projects with their allocated personnel, total allocation percentages,
 * and utilization metrics.
 * 
 * @returns {Promise<Array>} Array of projects with allocation summaries
 */
const getProjectAllocationSummary = async () => {
  const query = `
    SELECT 
      proj.id as project_id,
      proj.project_name,
      proj.status,
      proj.start_date,
      proj.end_date,
      COUNT(DISTINCT pa.personnel_id) as allocated_personnel_count,
      SUM(pa.allocation_percentage) as total_allocation_percentage,
      AVG(pa.allocation_percentage) as avg_allocation_percentage,
      GROUP_CONCAT(
        CONCAT(p.name, ' (', pa.allocation_percentage, '%)')
        SEPARATOR ', '
      ) as allocated_personnel
    FROM projects proj
    LEFT JOIN project_allocations pa ON pa.project_id = proj.id
    LEFT JOIN personnel p ON p.id = pa.personnel_id
    GROUP BY proj.id, proj.project_name, proj.status, proj.start_date, proj.end_date
    ORDER BY proj.start_date DESC
  `;
  
  const [results] = await pool.execute(query);
  return results;
};

/**
 * 4. Get Personnel Workload Analysis
 * 
 * Analyzes personnel workload by calculating total allocation percentages
 * across all active projects and checking for over-allocation (>100% total allocation).
 * 
 * @returns {Promise<Array>} Array of personnel with workload analysis
 */
const getPersonnelWorkloadAnalysis = async () => {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.email,
      p.role_title,
      COUNT(DISTINCT pa.project_id) as active_project_count,
      COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation_percentage,
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 100 THEN 'Over-allocated'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) = 100 THEN 'Fully allocated'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) < 100 AND COALESCE(SUM(pa.allocation_percentage), 0) > 0 THEN 'Partially allocated'
        ELSE 'Not allocated'
      END as allocation_status,
      GROUP_CONCAT(
        DISTINCT CONCAT(proj.project_name, ' (', pa.allocation_percentage, '%)')
        SEPARATOR ', '
      ) as project_allocations
    FROM personnel p
    LEFT JOIN project_allocations pa ON pa.personnel_id = p.id
      AND CURDATE() BETWEEN pa.start_date AND pa.end_date
    LEFT JOIN projects proj ON proj.id = pa.project_id
      AND proj.status IN ('Planning', 'Active')
    GROUP BY p.id, p.name, p.email, p.role_title
    ORDER BY total_allocation_percentage DESC
  `;
  
  const [results] = await pool.execute(query);
  return results;
};

/**
 * 5. Get Skill Gap Analysis for Project
 * 
 * Identifies which required skills are missing or have insufficient
 * proficiency among allocated personnel.
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Array of skill gaps
 */
const getSkillGapAnalysis = async (projectId) => {
  const query = `
    SELECT 
      prs.skill_id,
      s.skill_name,
      s.category,
      prs.minimum_proficiency as required_proficiency,
      COUNT(DISTINCT pa.personnel_id) as allocated_personnel_with_skill,
      COUNT(DISTINCT CASE 
        WHEN ps.proficiency_level IN ('Advanced', 'Expert') 
        OR (ps.proficiency_level = prs.minimum_proficiency 
            AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
        THEN pa.personnel_id 
      END) as personnel_meeting_requirement,
      GROUP_CONCAT(
        DISTINCT CONCAT(
          p.name, 
          ' (', 
          COALESCE(ps.proficiency_level, 'No skill'), 
          ')'
        )
        SEPARATOR ', '
      ) as allocated_personnel_skills
    FROM projects proj
    INNER JOIN project_required_skills prs ON prs.project_id = proj.id
    INNER JOIN skills s ON s.id = prs.skill_id
    LEFT JOIN project_allocations pa ON pa.project_id = proj.id
    LEFT JOIN personnel p ON p.id = pa.personnel_id
    LEFT JOIN personnel_skills ps ON ps.personnel_id = pa.personnel_id 
      AND ps.skill_id = prs.skill_id
    WHERE proj.id = ?
    GROUP BY prs.skill_id, s.skill_name, s.category, prs.minimum_proficiency
    ORDER BY personnel_meeting_requirement ASC, s.skill_name
  `;
  
  const [results] = await pool.execute(query, [projectId]);
  return results;
};

/**
 * 6. Get Available Personnel for Date Range
 * 
 * Finds personnel who are available (not over-allocated) for a specific
 * date range, considering both availability records and existing project allocations.
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of available personnel
 */
const getAvailablePersonnelForDateRange = async (startDate, endDate) => {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.email,
      p.role_title,
      p.experience_level,
      COALESCE(avail.availability_percentage, 100) as availability_percentage,
      COALESCE(SUM(alloc.allocation_percentage), 0) as current_allocation_percentage,
      (COALESCE(avail.availability_percentage, 100) - COALESCE(SUM(alloc.allocation_percentage), 0)) as remaining_capacity,
      CASE 
        WHEN (COALESCE(avail.availability_percentage, 100) - COALESCE(SUM(alloc.allocation_percentage), 0)) > 0 
        THEN 'Available'
        ELSE 'Fully allocated'
      END as availability_status
    FROM personnel p
    LEFT JOIN personnel_availability avail ON avail.personnel_id = p.id
      AND ? BETWEEN avail.start_date AND avail.end_date
      AND ? BETWEEN avail.start_date AND avail.end_date
    LEFT JOIN project_allocations alloc ON alloc.personnel_id = p.id
      AND (
        (? BETWEEN alloc.start_date AND alloc.end_date)
        OR (? BETWEEN alloc.start_date AND alloc.end_date)
        OR (alloc.start_date BETWEEN ? AND ?)
        OR (alloc.end_date BETWEEN ? AND ?)
      )
    GROUP BY p.id, p.name, p.email, p.role_title, p.experience_level, avail.availability_percentage
    HAVING remaining_capacity > 0
    ORDER BY remaining_capacity DESC, p.experience_level DESC
  `;
  
  const [results] = await pool.execute(query, [
    startDate, endDate, // for availability check
    startDate, endDate, // for allocation overlap checks
    startDate, endDate, // for allocation overlap checks
    startDate, endDate  // for allocation overlap checks
  ]);
  
  return results;
};

/**
 * 7. Get Top Skilled Personnel by Category
 * 
 * Identifies the most skilled personnel in each skill category based on
 * proficiency levels and years of experience.
 * 
 * @param {string} category - Optional skill category filter
 * @returns {Promise<Array>} Array of top skilled personnel
 */
const getTopSkilledPersonnelByCategory = async (category = null) => {
  let query = `
    SELECT 
      s.category,
      p.id as personnel_id,
      p.name,
      p.role_title,
      p.experience_level,
      COUNT(ps.skill_id) as skills_count,
      SUM(CASE ps.proficiency_level
        WHEN 'Expert' THEN 4
        WHEN 'Advanced' THEN 3
        WHEN 'Intermediate' THEN 2
        WHEN 'Beginner' THEN 1
        ELSE 0
      END) as proficiency_score,
      AVG(ps.years_of_experience) as avg_years_experience,
      GROUP_CONCAT(
        CONCAT(s.skill_name, ' (', ps.proficiency_level, ')')
        SEPARATOR ', '
      ) as skills_list
    FROM personnel p
    INNER JOIN personnel_skills ps ON ps.personnel_id = p.id
    INNER JOIN skills s ON s.id = ps.skill_id
  `;
  
  const params = [];
  if (category) {
    query += ' WHERE s.category = ?';
    params.push(category);
  }
  
  query += `
    GROUP BY s.category, p.id, p.name, p.role_title, p.experience_level
    ORDER BY s.category, proficiency_score DESC, skills_count DESC
  `;
  
  const [results] = await pool.execute(query, params);
  return results;
};

/**
 * 8. Get Project Timeline with Allocations
 * 
 * Shows project timeline with all personnel allocations, including
 * overlap detection and resource conflicts.
 * 
 * @param {number} projectId - Optional project ID filter
 * @returns {Promise<Array>} Array of project timelines
 */
const getProjectTimelineWithAllocations = async (projectId = null) => {
  let query = `
    SELECT 
      proj.id as project_id,
      proj.project_name,
      proj.start_date as project_start,
      proj.end_date as project_end,
      DATEDIFF(proj.end_date, proj.start_date) as project_duration_days,
      pa.personnel_id,
      p.name as personnel_name,
      pa.allocation_percentage,
      pa.start_date as allocation_start,
      pa.end_date as allocation_end,
      pa.role_in_project,
      CASE 
        WHEN pa.start_date < proj.start_date OR pa.end_date > proj.end_date 
        THEN 'Yes'
        ELSE 'No'
      END as has_timeline_overlap
    FROM projects proj
    LEFT JOIN project_allocations pa ON pa.project_id = proj.id
    LEFT JOIN personnel p ON p.id = pa.personnel_id
    WHERE proj.status IN ('Planning', 'Active')
  `;
  
  const params = [];
  if (projectId) {
    query += ' AND proj.id = ?';
    params.push(projectId);
  }
  
  query += ' ORDER BY proj.start_date, pa.start_date';
  
  const [results] = await pool.execute(query, params);
  return results;
};

/**
 * 9. Get Skill Demand vs Supply Analysis
 * 
 * Compares skill demand (from projects) vs supply (from personnel)
 * to identify skill shortages or surpluses.
 * 
 * @returns {Promise<Array>} Array of skill demand/supply analysis
 */
const getSkillDemandVsSupply = async () => {
  const query = `
    SELECT 
      s.id as skill_id,
      s.skill_name,
      s.category,
      COUNT(DISTINCT prs.project_id) as projects_requiring_skill,
      COUNT(DISTINCT ps.personnel_id) as personnel_with_skill,
      COUNT(DISTINCT CASE 
        WHEN ps.proficiency_level IN ('Advanced', 'Expert') 
        THEN ps.personnel_id 
      END) as expert_personnel_count,
      CASE 
        WHEN COUNT(DISTINCT ps.personnel_id) = 0 THEN 'Critical Shortage'
        WHEN COUNT(DISTINCT ps.personnel_id) < COUNT(DISTINCT prs.project_id) THEN 'Shortage'
        WHEN COUNT(DISTINCT ps.personnel_id) = COUNT(DISTINCT prs.project_id) THEN 'Balanced'
        ELSE 'Surplus'
      END as supply_status,
      GROUP_CONCAT(
        DISTINCT CONCAT(proj.project_name, ' (', prs.minimum_proficiency, ')')
        SEPARATOR ', '
      ) as requiring_projects
    FROM skills s
    LEFT JOIN project_required_skills prs ON prs.skill_id = s.id
    LEFT JOIN projects proj ON proj.id = prs.project_id 
      AND proj.status IN ('Planning', 'Active')
    LEFT JOIN personnel_skills ps ON ps.skill_id = s.id
    GROUP BY s.id, s.skill_name, s.category
    HAVING projects_requiring_skill > 0 OR personnel_with_skill > 0
    ORDER BY projects_requiring_skill DESC, personnel_with_skill ASC
  `;
  
  const [results] = await pool.execute(query);
  return results;
};

/**
 * 10. Get Personnel Competency Matrix
 * 
 * Creates a comprehensive view of all personnel with their skills,
 * proficiency levels, and experience.
 * 
 * @param {number} personnelId - Optional personnel ID filter
 * @returns {Promise<Array>} Array of personnel competency data
 */
const getPersonnelCompetencyMatrix = async (personnelId = null) => {
  let query = `
    SELECT 
      p.id as personnel_id,
      p.name,
      p.email,
      p.role_title,
      p.experience_level,
      s.category as skill_category,
      s.skill_name,
      ps.proficiency_level,
      ps.years_of_experience
    FROM personnel p
    INNER JOIN personnel_skills ps ON ps.personnel_id = p.id
    INNER JOIN skills s ON s.id = ps.skill_id
  `;
  
  const params = [];
  if (personnelId) {
    query += ' WHERE p.id = ?';
    params.push(personnelId);
  }
  
  query += ' ORDER BY p.name, s.category, s.skill_name';
  
  const [results] = await pool.execute(query, params);
  return results;
};

/**
 * 11. Get Project Readiness Score
 * 
 * Calculates a readiness score for projects based on whether all
 * required skills are covered by allocated personnel.
 * 
 * @param {number} projectId - Optional project ID filter
 * @returns {Promise<Array>} Array of projects with readiness scores
 */
const getProjectReadinessScore = async (projectId = null) => {
  let query = `
    SELECT 
      proj.id as project_id,
      proj.project_name,
      proj.status,
      COUNT(DISTINCT prs.skill_id) as total_required_skills,
      COUNT(DISTINCT CASE 
        WHEN ps.personnel_id IS NOT NULL 
        AND (
          ps.proficiency_level IN ('Advanced', 'Expert')
          OR (ps.proficiency_level = prs.minimum_proficiency 
              AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
        )
        THEN prs.skill_id 
      END) as covered_skills,
      ROUND(
        (COUNT(DISTINCT CASE 
          WHEN ps.personnel_id IS NOT NULL 
          AND (
            ps.proficiency_level IN ('Advanced', 'Expert')
            OR (ps.proficiency_level = prs.minimum_proficiency 
                AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
          )
          THEN prs.skill_id 
        END) * 100.0 / NULLIF(COUNT(DISTINCT prs.skill_id), 0)), 
        2
      ) as readiness_percentage,
      CASE 
        WHEN COUNT(DISTINCT prs.skill_id) = 0 THEN 'No Requirements Defined'
        WHEN COUNT(DISTINCT CASE 
          WHEN ps.personnel_id IS NOT NULL 
          AND (
            ps.proficiency_level IN ('Advanced', 'Expert')
            OR (ps.proficiency_level = prs.minimum_proficiency 
                AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
          )
          THEN prs.skill_id 
        END) = COUNT(DISTINCT prs.skill_id) THEN 'Ready'
        WHEN COUNT(DISTINCT CASE 
          WHEN ps.personnel_id IS NOT NULL 
          AND (
            ps.proficiency_level IN ('Advanced', 'Expert')
            OR (ps.proficiency_level = prs.minimum_proficiency 
                AND ps.proficiency_level IN ('Intermediate', 'Advanced', 'Expert'))
          )
          THEN prs.skill_id 
        END) >= COUNT(DISTINCT prs.skill_id) * 0.8 THEN 'Nearly Ready'
        ELSE 'Not Ready'
      END as readiness_status
    FROM projects proj
    LEFT JOIN project_required_skills prs ON prs.project_id = proj.id
    LEFT JOIN project_allocations pa ON pa.project_id = proj.id
    LEFT JOIN personnel_skills ps ON ps.personnel_id = pa.personnel_id 
      AND ps.skill_id = prs.skill_id
  `;
  
  const params = [];
  if (projectId) {
    query += ' WHERE proj.id = ?';
    params.push(projectId);
  }
  
  query += `
    GROUP BY proj.id, proj.project_name, proj.status
    ORDER BY readiness_percentage DESC
  `;
  
  const [results] = await pool.execute(query, params);
  return results;
};

/**
 * 12. Get Personnel Utilization Trend
 * 
 * Shows personnel utilization over time by month, useful for
 * capacity planning and resource management.
 * 
 * @param {number} months - Number of months to look back (default: 12)
 * @returns {Promise<Array>} Array of utilization trends
 */
const getPersonnelUtilizationTrend = async (months = 12) => {
  const query = `
    SELECT 
      DATE_FORMAT(pa.start_date, '%Y-%m') as month,
      p.id as personnel_id,
      p.name,
      COUNT(DISTINCT pa.project_id) as active_projects,
      SUM(pa.allocation_percentage) as total_allocation,
      AVG(pa.allocation_percentage) as avg_allocation,
      GROUP_CONCAT(
        DISTINCT CONCAT(proj.project_name, ' (', pa.allocation_percentage, '%)')
        SEPARATOR ', '
      ) as project_details
    FROM personnel p
    INNER JOIN project_allocations pa ON pa.personnel_id = p.id
    INNER JOIN projects proj ON proj.id = pa.project_id
    WHERE pa.start_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(pa.start_date, '%Y-%m'), p.id, p.name
    ORDER BY month DESC, total_allocation DESC
  `;
  
  const [results] = await pool.execute(query, [months]);
  return results;
};

module.exports = {
  getPersonnelWithAvailabilityForProjectDates,
  getPersonnelWithSkillMatchingScore,
  getProjectAllocationSummary,
  getPersonnelWorkloadAnalysis,
  getSkillGapAnalysis,
  getAvailablePersonnelForDateRange,
  getTopSkilledPersonnelByCategory,
  getProjectTimelineWithAllocations,
  getSkillDemandVsSupply,
  getPersonnelCompetencyMatrix,
  getProjectReadinessScore,
  getPersonnelUtilizationTrend
};

