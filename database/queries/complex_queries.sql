-- ============================================
-- COMPLEX QUERIES FOR SKILLS MANAGEMENT SYSTEM
-- ============================================
-- This file contains complex SQL queries for advanced operations
-- These queries can be used in controllers or as stored procedures
-- ============================================

-- ============================================
-- 1. GET PERSONNEL WITH AVAILABILITY FOR PROJECT DATES
-- ============================================
-- Description: Retrieves all personnel with their availability percentage
-- for a specific project's date range. If no availability record exists,
-- defaults to 100% availability.
-- 
-- Usage: Replace @project_start_date and @project_end_date with actual dates
-- ============================================

SELECT 
    p.*,
    COALESCE(
        (SELECT availability_percentage 
         FROM personnel_availability 
         WHERE personnel_id = p.id 
         AND @project_start_date BETWEEN start_date AND end_date
         AND @project_end_date BETWEEN start_date AND end_date
         LIMIT 1),
        100
    ) as availability_percentage,
    COALESCE(
        (SELECT notes 
         FROM personnel_availability 
         WHERE personnel_id = p.id 
         AND @project_start_date BETWEEN start_date AND end_date
         AND @project_end_date BETWEEN start_date AND end_date
         LIMIT 1),
        'No availability record'
    ) as availability_notes
FROM personnel p
ORDER BY p.name;

-- Alternative version using AVG for overlapping periods
SELECT 
    p.*,
    COALESCE(
        (SELECT AVG(availability_percentage)
         FROM personnel_availability 
         WHERE personnel_id = p.id 
         AND start_date <= @project_end_date
         AND end_date >= @project_start_date),
        100
    ) as avg_availability_percentage
FROM personnel p
ORDER BY p.name;


-- ============================================
-- 2. GET PERSONNEL WITH SKILL MATCHING SCORE FOR PROJECT
-- ============================================
-- Description: Returns personnel with their skill matching score
-- based on project requirements. Calculates how many required skills
-- each personnel has and their proficiency match status.
-- ============================================

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
WHERE proj.id = @project_id
GROUP BY p.id, p.name, p.email, p.role_title, p.experience_level
HAVING matching_skills_count > 0
ORDER BY match_percentage DESC, p.experience_level DESC;


-- ============================================
-- 3. GET PROJECT ALLOCATION SUMMARY WITH UTILIZATION
-- ============================================
-- Description: Shows all projects with their allocated personnel,
-- total allocation percentages, and utilization metrics.
-- ============================================

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
ORDER BY proj.start_date DESC;


-- ============================================
-- 4. GET PERSONNEL WORKLOAD ANALYSIS
-- ============================================
-- Description: Analyzes personnel workload by calculating total
-- allocation percentages across all active projects and checking
-- for over-allocation (>100% total allocation).
-- ============================================

SELECT 
    p.id,
    p.name,
    p.email,
    p.role_title,
    COUNT(DISTINCT pa.project_id) as active_project_count,
    SUM(pa.allocation_percentage) as total_allocation_percentage,
    CASE 
        WHEN SUM(pa.allocation_percentage) > 100 THEN 'Over-allocated'
        WHEN SUM(pa.allocation_percentage) = 100 THEN 'Fully allocated'
        WHEN SUM(pa.allocation_percentage) < 100 AND SUM(pa.allocation_percentage) > 0 THEN 'Partially allocated'
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
HAVING total_allocation_percentage IS NOT NULL
ORDER BY total_allocation_percentage DESC;


-- ============================================
-- 5. GET SKILL GAP ANALYSIS FOR PROJECT
-- ============================================
-- Description: Identifies which required skills are missing or
-- have insufficient proficiency among allocated personnel.
-- ============================================

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
WHERE proj.id = @project_id
GROUP BY prs.skill_id, s.skill_name, s.category, prs.minimum_proficiency
ORDER BY personnel_meeting_requirement ASC, s.skill_name;


-- ============================================
-- 6. GET AVAILABLE PERSONNEL FOR DATE RANGE
-- ============================================
-- Description: Finds personnel who are available (not over-allocated)
-- for a specific date range, considering both availability records
-- and existing project allocations.
-- ============================================

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
    AND @start_date BETWEEN avail.start_date AND avail.end_date
    AND @end_date BETWEEN avail.start_date AND avail.end_date
LEFT JOIN project_allocations alloc ON alloc.personnel_id = p.id
    AND (
        (@start_date BETWEEN alloc.start_date AND alloc.end_date)
        OR (@end_date BETWEEN alloc.start_date AND alloc.end_date)
        OR (alloc.start_date BETWEEN @start_date AND @end_date)
        OR (alloc.end_date BETWEEN @start_date AND @end_date)
    )
GROUP BY p.id, p.name, p.email, p.role_title, p.experience_level, avail.availability_percentage
HAVING remaining_capacity > 0
ORDER BY remaining_capacity DESC, p.experience_level DESC;


-- ============================================
-- 7. GET TOP SKILLED PERSONNEL BY CATEGORY
-- ============================================
-- Description: Identifies the most skilled personnel in each
-- skill category based on proficiency levels and years of experience.
-- ============================================

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
GROUP BY s.category, p.id, p.name, p.role_title, p.experience_level
ORDER BY s.category, proficiency_score DESC, skills_count DESC;


-- ============================================
-- 8. GET PROJECT TIMELINE WITH ALLOCATIONS
-- ============================================
-- Description: Shows project timeline with all personnel allocations,
-- including overlap detection and resource conflicts.
-- ============================================

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
    END as has_timeline_overlap,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM project_allocations pa2 
            WHERE pa2.personnel_id = pa.personnel_id
            AND pa2.id != pa.id
            AND (
                (pa.start_date BETWEEN pa2.start_date AND pa2.end_date)
                OR (pa.end_date BETWEEN pa2.start_date AND pa2.end_date)
                OR (pa2.start_date BETWEEN pa.start_date AND pa.end_date)
            )
        ) THEN 'Yes'
        ELSE 'No'
    END as has_conflicting_allocation
FROM projects proj
LEFT JOIN project_allocations pa ON pa.project_id = proj.id
LEFT JOIN personnel p ON p.id = pa.personnel_id
WHERE proj.status IN ('Planning', 'Active')
ORDER BY proj.start_date, pa.start_date;


-- ============================================
-- 9. GET SKILL DEMAND VS SUPPLY ANALYSIS
-- ============================================
-- Description: Compares skill demand (from projects) vs supply
-- (from personnel) to identify skill shortages or surpluses.
-- ============================================

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
ORDER BY projects_requiring_skill DESC, personnel_with_skill ASC;


-- ============================================
-- 10. GET PERSONNEL COMPETENCY MATRIX
-- ============================================
-- Description: Creates a comprehensive view of all personnel
-- with their skills, proficiency levels, and experience.
-- ============================================

SELECT 
    p.id as personnel_id,
    p.name,
    p.email,
    p.role_title,
    p.experience_level,
    s.category as skill_category,
    s.skill_name,
    ps.proficiency_level,
    ps.years_of_experience,
    CASE 
        WHEN ps.proficiency_level = 'Expert' THEN '★★★★'
        WHEN ps.proficiency_level = 'Advanced' THEN '★★★'
        WHEN ps.proficiency_level = 'Intermediate' THEN '★★'
        WHEN ps.proficiency_level = 'Beginner' THEN '★'
        ELSE ''
    END as proficiency_stars
FROM personnel p
INNER JOIN personnel_skills ps ON ps.personnel_id = p.id
INNER JOIN skills s ON s.id = ps.skill_id
ORDER BY p.name, s.category, s.skill_name;


-- ============================================
-- 11. GET PROJECT READINESS SCORE
-- ============================================
-- Description: Calculates a readiness score for projects based on
-- whether all required skills are covered by allocated personnel.
-- ============================================

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
GROUP BY proj.id, proj.project_name, proj.status
ORDER BY readiness_percentage DESC;


-- ============================================
-- 12. GET PERSONNEL UTILIZATION TREND
-- ============================================
-- Description: Shows personnel utilization over time by month,
-- useful for capacity planning and resource management.
-- ============================================

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
WHERE pa.start_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(pa.start_date, '%Y-%m'), p.id, p.name
ORDER BY month DESC, total_allocation DESC;


-- ============================================
-- NOTES ON USAGE
-- ============================================
-- 1. Replace @project_id, @project_start_date, @project_end_date, 
--    @start_date, @end_date with actual values or use parameterized queries
-- 
-- 2. These queries can be adapted for use in Node.js controllers:
--    const [results] = await pool.execute(query, [param1, param2, ...]);
-- 
-- 3. For better performance, consider adding indexes on:
--    - personnel_availability (personnel_id, start_date, end_date)
--    - project_allocations (personnel_id, start_date, end_date)
--    - project_allocations (project_id, start_date, end_date)
-- 
-- 4. Some queries may need adjustment based on your specific
--    business logic requirements
-- ============================================

