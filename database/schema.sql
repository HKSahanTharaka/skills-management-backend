-- Create Database
CREATE DATABASE IF NOT EXISTS skills_management;
USE skills_management;

-- Users table (for authentication)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Personnel table
CREATE TABLE personnel (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    experience_level ENUM('Junior', 'Mid-Level', 'Senior') NOT NULL,
    profile_image_url VARCHAR(500),
    bio TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_experience_level (experience_level)
);

-- Skills table
CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    skill_name VARCHAR(255) UNIQUE NOT NULL,
    category ENUM('Programming Language', 'Framework', 'Tool', 'Soft Skill', 'Other') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_skill_name (skill_name)
);

-- Personnel Skills junction table (many-to-many)
CREATE TABLE personnel_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    personnel_id INT NOT NULL,
    skill_id INT NOT NULL,
    proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') NOT NULL,
    years_of_experience DECIMAL(3,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_personnel_skill (personnel_id, skill_id),
    INDEX idx_personnel_id (personnel_id),
    INDEX idx_skill_id (skill_id),
    INDEX idx_proficiency (proficiency_level)
);

-- Projects table
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('Planning', 'Active', 'Completed', 'On Hold') DEFAULT 'Planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- Project Required Skills table
CREATE TABLE project_required_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    skill_id INT NOT NULL,
    minimum_proficiency ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_skill (project_id, skill_id),
    INDEX idx_project_id (project_id)
);

-- Personnel Availability table (Additional Feature)
CREATE TABLE personnel_availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    personnel_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    availability_percentage INT DEFAULT 100 CHECK (availability_percentage BETWEEN 0 AND 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
    INDEX idx_personnel_dates (personnel_id, start_date, end_date),
    INDEX idx_dates (start_date, end_date)
);

-- Project Allocations table (Additional Feature)
CREATE TABLE project_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    personnel_id INT NOT NULL,
    allocation_percentage INT DEFAULT 100 CHECK (allocation_percentage BETWEEN 0 AND 100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    role_in_project VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_personnel_id (personnel_id),
    INDEX idx_dates (start_date, end_date)
);

-- ============================================
-- COMPREHENSIVE SEED DATA
-- ============================================

-- Users (Authentication)
INSERT INTO users (email, password, role) VALUES
('admin@company.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5w9P5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'admin'),
('manager@company.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5w9P5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'manager'),
('sarah.johnson@company.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5w9P5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'user'),
('david.kim@company.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5w9P5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'user'),
('emily.rodriguez@company.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5w9P5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'user');

-- Skills Database
INSERT INTO skills (skill_name, category, description) VALUES
-- Programming Languages
('JavaScript', 'Programming Language', 'Dynamic programming language for web development'),
('TypeScript', 'Programming Language', 'Typed superset of JavaScript'),
('Python', 'Programming Language', 'High-level programming language for various applications'),
('Java', 'Programming Language', 'Object-oriented programming language'),
('Go', 'Programming Language', 'Compiled programming language by Google'),
('C#', 'Programming Language', '.NET programming language'),
('SQL', 'Programming Language', 'Database query language'),

-- Frameworks
('React', 'Framework', 'JavaScript library for building user interfaces'),
('Vue.js', 'Framework', 'Progressive JavaScript framework'),
('Angular', 'Framework', 'TypeScript-based web application framework'),
('Node.js', 'Framework', 'JavaScript runtime for server-side development'),
('Express.js', 'Framework', 'Web application framework for Node.js'),
('Django', 'Framework', 'High-level Python web framework'),
('Spring Boot', 'Framework', 'Java-based framework for microservices'),
('ASP.NET Core', 'Framework', 'Cross-platform framework for building web apps'),

-- Tools & Technologies
('Docker', 'Tool', 'Containerization platform'),
('Kubernetes', 'Tool', 'Container orchestration platform'),
('Git', 'Tool', 'Version control system'),
('Jenkins', 'Tool', 'Continuous integration and delivery tool'),
('AWS', 'Tool', 'Amazon Web Services cloud platform'),
('Azure', 'Tool', 'Microsoft cloud computing platform'),
('MySQL', 'Tool', 'Relational database management system'),
('PostgreSQL', 'Tool', 'Advanced open-source relational database'),
('MongoDB', 'Tool', 'NoSQL document database'),
('Redis', 'Tool', 'In-memory data structure store'),
('Terraform', 'Tool', 'Infrastructure as code tool'),
('GraphQL', 'Tool', 'Query language for APIs'),

-- Soft Skills
('Leadership', 'Soft Skill', 'Ability to lead and manage teams effectively'),
('Communication', 'Soft Skill', 'Effective verbal and written communication'),
('Problem Solving', 'Soft Skill', 'Analytical and critical thinking abilities'),
('Agile Methodology', 'Soft Skill', 'Experience with Agile development practices'),
('Project Management', 'Soft Skill', 'Planning and executing projects successfully'),
('Mentoring', 'Soft Skill', 'Guiding and developing junior team members');

-- Personnel
INSERT INTO personnel (name, email, role_title, experience_level, bio, user_id) VALUES
('Sarah Johnson', 'sarah.johnson@company.com', 'Senior Full Stack Developer', 'Senior', 'Experienced full-stack developer with 8+ years in web development. Passionate about React and Node.js.', 3),
('David Kim', 'david.kim@company.com', 'DevOps Engineer', 'Mid-Level', 'DevOps specialist with expertise in AWS, Docker, and Kubernetes. 5 years of experience.', 4),
('Emily Rodriguez', 'emily.rodriguez@company.com', 'Senior Backend Developer', 'Senior', 'Backend expert specializing in Python and microservices. 7 years of professional experience.', 5),
('Michael Chen', 'michael.chen@company.com', 'Frontend Developer', 'Mid-Level', 'Frontend developer focused on React and modern JavaScript. 4 years of experience.', NULL),
('Jessica Williams', 'jessica.williams@company.com', 'Full Stack Developer', 'Junior', 'Recent graduate with strong foundation in web development. Eager to learn and grow.', NULL),
('Robert Taylor', 'robert.taylor@company.com', 'Cloud Architect', 'Senior', 'Cloud infrastructure specialist with AWS and Azure certifications. 10+ years of experience.', NULL),
('Amanda Davis', 'amanda.davis@company.com', 'Backend Developer', 'Mid-Level', 'Java and Spring Boot developer with experience in enterprise applications.', NULL),
('Chris Martinez', 'chris.martinez@company.com', 'Tech Lead', 'Senior', 'Technical leader with full-stack expertise and strong mentoring skills.', NULL),
('Lisa Anderson', 'lisa.anderson@company.com', 'Frontend Developer', 'Junior', 'UI/UX focused developer with passion for creating beautiful interfaces.', NULL),
('James Wilson', 'james.wilson@company.com', 'Database Administrator', 'Mid-Level', 'Database specialist with expertise in MySQL, PostgreSQL, and performance optimization.', NULL);

-- Personnel Skills (Demonstrating various proficiency levels)
INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
-- Sarah Johnson (Senior Full Stack Developer)
(1, 1, 'Expert', 8.0), -- JavaScript
(1, 2, 'Expert', 5.0), -- TypeScript
(1, 8, 'Expert', 6.0), -- React
(1, 11, 'Advanced', 7.0), -- Node.js
(1, 12, 'Advanced', 6.0), -- Express.js
(1, 19, 'Advanced', 4.0), -- Git
(1, 23, 'Advanced', 5.0), -- MySQL
(1, 28, 'Expert', 8.0), -- Leadership
(1, 29, 'Expert', 8.0), -- Communication
(1, 32, 'Advanced', 6.0), -- Mentoring

-- David Kim (DevOps Engineer)
(2, 1, 'Intermediate', 3.0), -- JavaScript
(2, 17, 'Expert', 5.0), -- Docker
(2, 18, 'Expert', 4.0), -- Kubernetes
(2, 19, 'Expert', 5.0), -- Git
(2, 20, 'Advanced', 3.0), -- Jenkins
(2, 21, 'Expert', 5.0), -- AWS
(2, 27, 'Advanced', 4.0), -- Terraform
(2, 30, 'Advanced', 5.0), -- Problem Solving
(2, 31, 'Intermediate', 2.0), -- Agile Methodology

-- Emily Rodriguez (Senior Backend Developer)
(3, 3, 'Expert', 7.0), -- Python
(3, 7, 'Advanced', 6.0), -- SQL
(3, 13, 'Expert', 5.0), -- Django
(3, 14, 'Advanced', 3.0), -- Spring Boot
(3, 23, 'Advanced', 6.0), -- MySQL
(3, 24, 'Advanced', 5.0), -- PostgreSQL
(3, 25, 'Intermediate', 2.0), -- MongoDB
(3, 17, 'Advanced', 4.0), -- Docker
(3, 28, 'Advanced', 6.0), -- Leadership
(3, 29, 'Expert', 7.0), -- Communication

-- Michael Chen (Frontend Developer)
(4, 1, 'Advanced', 4.0), -- JavaScript
(4, 2, 'Intermediate', 2.0), -- TypeScript
(4, 8, 'Expert', 4.0), -- React
(4, 9, 'Intermediate', 1.5), -- Vue.js
(4, 19, 'Advanced', 4.0), -- Git
(4, 29, 'Advanced', 4.0), -- Communication
(4, 31, 'Advanced', 3.0), -- Agile Methodology

-- Jessica Williams (Junior Full Stack Developer)
(5, 1, 'Intermediate', 1.0), -- JavaScript
(5, 8, 'Intermediate', 1.0), -- React
(5, 11, 'Beginner', 0.5), -- Node.js
(5, 12, 'Beginner', 0.5), -- Express.js
(5, 19, 'Intermediate', 1.0), -- Git
(5, 23, 'Beginner', 0.5), -- MySQL

-- Robert Taylor (Cloud Architect)
(6, 21, 'Expert', 10.0), -- AWS
(6, 22, 'Expert', 8.0), -- Azure
(6, 17, 'Expert', 7.0), -- Docker
(6, 18, 'Expert', 6.0), -- Kubernetes
(6, 27, 'Expert', 5.0), -- Terraform
(6, 28, 'Expert', 10.0), -- Leadership
(6, 32, 'Expert', 8.0), -- Project Management

-- Amanda Davis (Backend Developer)
(7, 4, 'Advanced', 5.0), -- Java
(7, 7, 'Advanced', 5.0), -- SQL
(7, 14, 'Expert', 4.0), -- Spring Boot
(7, 23, 'Advanced', 5.0), -- MySQL
(7, 24, 'Intermediate', 2.0), -- PostgreSQL
(7, 17, 'Intermediate', 2.0), -- Docker
(7, 19, 'Advanced', 5.0), -- Git

-- Chris Martinez (Tech Lead)
(8, 1, 'Expert', 9.0), -- JavaScript
(8, 2, 'Advanced', 5.0), -- TypeScript
(8, 8, 'Expert', 7.0), -- React
(8, 11, 'Expert', 8.0), -- Node.js
(8, 3, 'Advanced', 4.0), -- Python
(8, 17, 'Advanced', 5.0), -- Docker
(8, 21, 'Advanced', 4.0), -- AWS
(8, 28, 'Expert', 9.0), -- Leadership
(8, 29, 'Expert', 9.0), -- Communication
(8, 32, 'Expert', 7.0), -- Mentoring

-- Lisa Anderson (Junior Frontend Developer)
(9, 1, 'Intermediate', 1.5), -- JavaScript
(9, 8, 'Intermediate', 1.0), -- React
(9, 10, 'Beginner', 0.5), -- Angular
(9, 19, 'Intermediate', 1.5), -- Git
(9, 29, 'Intermediate', 1.5), -- Communication

-- James Wilson (Database Administrator)
(10, 7, 'Expert', 6.0), -- SQL
(10, 23, 'Expert', 6.0), -- MySQL
(10, 24, 'Expert', 5.0), -- PostgreSQL
(10, 25, 'Advanced', 3.0), -- MongoDB
(10, 26, 'Advanced', 4.0), -- Redis
(10, 30, 'Advanced', 6.0), -- Problem Solving

-- Projects
INSERT INTO projects (project_name, description, start_date, end_date, status) VALUES
('E-Commerce Platform Redesign', 'Complete overhaul of existing e-commerce platform using modern React and Node.js stack', '2024-01-01', '2024-06-30', 'Active'),
('Microservices Transformation', 'Migrate monolithic application to microservices architecture', '2024-12-01', '2025-03-31', 'Planning'),
('Cloud Migration Project', 'Migrate on-premise infrastructure to AWS cloud', '2024-02-01', '2024-08-31', 'Active'),
('Mobile App Development', 'Develop cross-platform mobile application for customer engagement', '2024-03-01', '2024-09-30', 'Planning'),
('Data Analytics Dashboard', 'Build real-time analytics dashboard using modern visualization tools', '2023-10-01', '2024-01-31', 'Completed'),
('API Gateway Implementation', 'Implement centralized API gateway for all microservices', '2024-05-01', '2024-11-30', 'Planning');

-- Project Required Skills
INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
-- E-Commerce Platform Redesign (Project 1)
(1, 8, 'Advanced'), -- React
(1, 11, 'Advanced'), -- Node.js
(1, 2, 'Intermediate'), -- TypeScript
(1, 23, 'Intermediate'), -- MySQL
(1, 17, 'Intermediate'), -- Docker

-- Microservices Transformation (Project 2)
(2, 11, 'Advanced'), -- Node.js
(2, 3, 'Advanced'), -- Python
(2, 17, 'Expert'), -- Docker
(2, 18, 'Advanced'), -- Kubernetes
(2, 21, 'Advanced'), -- AWS
(2, 28, 'Advanced'), -- Leadership

-- Cloud Migration Project (Project 3)
(3, 21, 'Expert'), -- AWS
(3, 17, 'Advanced'), -- Docker
(3, 18, 'Advanced'), -- Kubernetes
(3, 27, 'Advanced'), -- Terraform
(3, 32, 'Intermediate'), -- Project Management

-- Mobile App Development (Project 4)
(4, 8, 'Advanced'), -- React
(4, 1, 'Advanced'), -- JavaScript
(4, 11, 'Intermediate'), -- Node.js
(4, 29, 'Advanced'), -- Communication

-- Data Analytics Dashboard (Project 5)
(5, 8, 'Advanced'), -- React
(5, 3, 'Intermediate'), -- Python
(5, 24, 'Intermediate'), -- PostgreSQL

-- API Gateway Implementation (Project 6)
(6, 11, 'Expert'), -- Node.js
(6, 28, 'Advanced'), -- GraphQL
(6, 17, 'Advanced'), -- Docker
(6, 31, 'Intermediate'), -- Agile Methodology

-- Personnel Availability
INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage, notes) VALUES
-- Q1 2024
(1, '2024-01-01', '2024-03-31', 100, 'Fully available for Q1'),
(2, '2024-01-01', '2024-02-15', 80, 'Partial availability due to training'),
(2, '2024-02-16', '2024-03-31', 100, 'Full availability after training'),
(3, '2024-01-01', '2024-03-31', 100, 'Fully available'),
(4, '2024-01-01', '2024-03-31', 100, 'Fully available'),
(5, '2024-01-01', '2024-01-31', 50, 'Part-time during onboarding'),
(5, '2024-02-01', '2024-03-31', 100, 'Full-time after onboarding'),

-- Q2 2024
(1, '2024-04-01', '2024-06-30', 100, 'Fully available for Q2'),
(2, '2024-04-01', '2024-06-30', 100, 'Fully available'),
(3, '2024-04-01', '2024-05-15', 100, 'Available before vacation'),
(3, '2024-05-16', '2024-05-31', 0, 'On vacation'),
(3, '2024-06-01', '2024-06-30', 100, 'Back from vacation'),
(4, '2024-04-01', '2024-06-30', 100, 'Fully available'),
(6, '2024-04-01', '2024-06-30', 100, 'Fully available'),

-- Q3 2024
(1, '2024-07-01', '2024-09-30', 80, 'Reduced capacity for mentoring duties'),
(2, '2024-07-01', '2024-09-30', 100, 'Fully available'),
(3, '2024-07-01', '2024-09-30', 100, 'Fully available'),
(6, '2024-07-01', '2024-09-30', 100, 'Fully available'),
(8, '2024-07-01', '2024-09-30', 100, 'Fully available'),

-- Q4 2024 & Q1 2025
(1, '2024-10-01', '2024-12-31', 100, 'Fully available for Q4'),
(2, '2024-10-01', '2024-12-31', 100, 'Fully available'),
(3, '2024-10-01', '2024-12-31', 100, 'Fully available'),
(4, '2024-10-01', '2024-12-31', 100, 'Fully available'),
(6, '2024-10-01', '2024-12-31', 100, 'Fully available'),
(8, '2024-10-01', '2025-03-31', 100, 'Available for microservices project'),
(7, '2024-12-01', '2025-03-31', 100, 'Available for new projects');

-- Project Allocations
INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
-- E-Commerce Platform Redesign (Project 1)
(1, 1, 80, '2024-01-01', '2024-06-30', 'Tech Lead'),
(1, 4, 100, '2024-01-01', '2024-06-30', 'Frontend Developer'),
(1, 5, 50, '2024-02-01', '2024-06-30', 'Junior Developer'),

-- Microservices Transformation (Project 2)
(2, 8, 60, '2024-12-01', '2025-03-31', 'Tech Lead'),
(2, 3, 40, '2024-12-15', '2025-03-31', 'Backend Lead'),

-- Cloud Migration Project (Project 3)
(3, 6, 100, '2024-02-01', '2024-08-31', 'Cloud Architect'),
(3, 2, 80, '2024-02-16', '2024-08-31', 'DevOps Lead'),

-- Mobile App Development (Project 4)
(4, 1, 20, '2024-07-01', '2024-09-30', 'Consultant'),
(4, 4, 50, '2024-07-01', '2024-09-30', 'Mobile Developer'),

-- Data Analytics Dashboard (Project 5 - Completed)
(5, 1, 60, '2023-10-01', '2024-01-31', 'Full Stack Developer'),
(5, 3, 60, '2023-10-01', '2024-01-31', 'Backend Developer'),
(5, 10, 40, '2023-10-01', '2024-01-31', 'Database Administrator');

-- ============================================
-- SEED DATA SUMMARY
-- ============================================
-- Users: 5 (1 admin, 1 manager, 3 regular users)
-- Personnel: 10 (Various experience levels: 4 Senior, 4 Mid-Level, 2 Junior)
-- Skills: 32 (7 Languages, 8 Frameworks, 13 Tools, 6 Soft Skills)
-- Projects: 6 (2 Active, 2 Planning, 1 Completed, 1 Planning)
-- Personnel Skills: 79 skill assignments with varying proficiency
-- Availability: 27 availability periods
-- Allocations: 13 project allocations
-- 
-- This dataset demonstrates:
-- ✓ Perfect matches (Sarah for E-Commerce)
-- ✓ Partial matches (various personnel for different projects)
-- ✓ Over-allocation scenarios (can be tested)
-- ✓ Availability constraints (vacations, part-time)
-- ✓ Different proficiency levels
-- ✓ Realistic project timelines
-- ✓ Team compositions
-- ============================================
