DROP DATABASE IF EXISTS skills_management;
CREATE DATABASE skills_management;
USE skills_management;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager') DEFAULT 'manager',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_approval_status (approval_status)
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

-- Personnel Availability table
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

-- Project Allocations table
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

INSERT INTO users (email, password, role, approval_status) VALUES
('admin@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'admin', 'approved'),
('john.smith@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'admin', 'approved'),
('manager@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'manager', 'approved'),
('sarah.johnson@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'manager', 'approved'),
('michael.chen@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'manager', 'approved'),
('emily.davis@techcorp.com', '$2a$10$rZ5jLZPJ5w9P5qPZ5w9P5uEjP5qPZ5w9P5qPZ5w9P5qPZ5w9P5qPZ5', 'manager', 'pending');

INSERT INTO skills (skill_name, category, description) VALUES
('JavaScript', 'Programming Language', 'Dynamic programming language for web development'),
('TypeScript', 'Programming Language', 'Typed superset of JavaScript for large-scale applications'),
('Python', 'Programming Language', 'High-level programming language for AI, data science, and web development'),
('Java', 'Programming Language', 'Enterprise-grade object-oriented programming language'),
('C#', 'Programming Language', '.NET programming language for Windows and cross-platform development'),
('Go', 'Programming Language', 'Compiled language by Google for concurrent programming'),
('Ruby', 'Programming Language', 'Dynamic language known for elegant syntax and Rails framework'),
('PHP', 'Programming Language', 'Server-side scripting language for web development'),
('Kotlin', 'Programming Language', 'Modern JVM language for Android and backend development'),
('Swift', 'Programming Language', 'Apple programming language for iOS and macOS'),
('Rust', 'Programming Language', 'Systems programming language focused on safety and performance'),
('SQL', 'Programming Language', 'Database query and manipulation language');

INSERT INTO skills (skill_name, category, description) VALUES
('React', 'Framework', 'JavaScript library for building user interfaces'),
('Angular', 'Framework', 'TypeScript-based web application framework by Google'),
('Vue.js', 'Framework', 'Progressive JavaScript framework for building UIs'),
('Node.js', 'Framework', 'JavaScript runtime for server-side development'),
('Express.js', 'Framework', 'Minimal web application framework for Node.js'),
('Django', 'Framework', 'High-level Python web framework'),
('Flask', 'Framework', 'Lightweight Python web framework'),
('Spring Boot', 'Framework', 'Java framework for building microservices'),
('ASP.NET Core', 'Framework', 'Cross-platform framework for building web apps'),
('Laravel', 'Framework', 'PHP web application framework'),
('Ruby on Rails', 'Framework', 'Full-stack web framework for Ruby'),
('FastAPI', 'Framework', 'Modern Python API framework'),
('Next.js', 'Framework', 'React framework for production'),
('Svelte', 'Framework', 'Reactive web framework');

INSERT INTO skills (skill_name, category, description) VALUES
('Docker', 'Tool', 'Containerization platform for application deployment'),
('Kubernetes', 'Tool', 'Container orchestration platform'),
('Git', 'Tool', 'Distributed version control system'),
('Jenkins', 'Tool', 'Continuous integration and delivery automation'),
('GitLab CI/CD', 'Tool', 'Integrated CI/CD platform'),
('AWS', 'Tool', 'Amazon Web Services cloud platform'),
('Azure', 'Tool', 'Microsoft Azure cloud computing platform'),
('Google Cloud', 'Tool', 'Google Cloud Platform services'),
('MySQL', 'Tool', 'Popular open-source relational database'),
('PostgreSQL', 'Tool', 'Advanced open-source relational database'),
('MongoDB', 'Tool', 'NoSQL document database'),
('Redis', 'Tool', 'In-memory data structure store'),
('Elasticsearch', 'Tool', 'Search and analytics engine'),
('Terraform', 'Tool', 'Infrastructure as code tool'),
('Ansible', 'Tool', 'IT automation and configuration management'),
('GraphQL', 'Tool', 'Query language for APIs'),
('REST API', 'Tool', 'RESTful web service architecture'),
('Microservices', 'Tool', 'Architectural style for distributed systems'),
('JIRA', 'Tool', 'Project management and issue tracking'),
('Figma', 'Tool', 'Collaborative UI/UX design tool'),
('Postman', 'Tool', 'API development and testing platform');

INSERT INTO skills (skill_name, category, description) VALUES
('Leadership', 'Soft Skill', 'Ability to lead and inspire teams'),
('Communication', 'Soft Skill', 'Effective verbal and written communication'),
('Problem Solving', 'Soft Skill', 'Analytical thinking and solution design'),
('Agile Methodology', 'Soft Skill', 'Experience with Scrum, Kanban, and agile practices'),
('Project Management', 'Soft Skill', 'Planning, executing, and delivering projects'),
('Mentoring', 'Soft Skill', 'Guiding and developing junior team members'),
('Team Collaboration', 'Soft Skill', 'Working effectively in team environments'),
('Time Management', 'Soft Skill', 'Prioritizing and managing time efficiently'),
('Critical Thinking', 'Soft Skill', 'Analyzing situations and making informed decisions'),
('Stakeholder Management', 'Soft Skill', 'Managing expectations and communications with stakeholders');

INSERT INTO skills (skill_name, category, description) VALUES
('Machine Learning', 'Other', 'AI and ML model development'),
('Data Science', 'Other', 'Data analysis and statistical modeling'),
('DevOps', 'Other', 'Development and operations integration'),
('Cybersecurity', 'Other', 'Information security and protection'),
('UI/UX Design', 'Other', 'User interface and experience design'),
('Mobile Development', 'Other', 'iOS and Android app development'),
('Blockchain', 'Other', 'Distributed ledger technology');

INSERT INTO personnel (name, email, role_title, experience_level, bio, user_id) VALUES
('John Smith', 'john.smith@techcorp.com', 'Chief Technology Officer', 'Senior', 
 'Visionary technology leader with 15+ years of experience in software architecture and team leadership. Expert in cloud infrastructure and enterprise solutions.', 2),
('Sarah Johnson', 'sarah.johnson@techcorp.com', 'Senior Full Stack Developer', 'Senior', 
 'Passionate full-stack engineer with 10+ years building scalable web applications. Specializes in React, Node.js, and cloud architecture.', 4),

('Michael Chen', 'michael.chen@techcorp.com', 'Lead DevOps Engineer', 'Senior', 
 'DevOps expert with deep knowledge of AWS, Kubernetes, and CI/CD pipelines. 12 years of experience in infrastructure automation.', 5),

('Emily Davis', 'emily.davis@techcorp.com', 'Senior Backend Developer', 'Senior', 
 'Backend specialist with expertise in Python, Java, and microservices architecture. 9 years of professional experience.', 6),

('Robert Wilson', 'robert.wilson@techcorp.com', 'Solutions Architect', 'Senior', 
 'Enterprise solutions architect designing scalable systems for Fortune 500 companies. 11 years in the industry.', NULL),

('Jennifer Martinez', 'jennifer.martinez@techcorp.com', 'Senior Frontend Developer', 'Senior', 
 'Frontend expert passionate about creating beautiful, performant user interfaces. React and Vue.js specialist with 8 years experience.', NULL),

('David Thompson', 'david.thompson@techcorp.com', 'Technical Lead', 'Senior', 
 'Technical leader with strong background in Java, Spring Boot, and distributed systems. 10 years of development and leadership.', NULL),
('Lisa Anderson', 'lisa.anderson@techcorp.com', 'Full Stack Developer', 'Mid-Level', 
 'Full-stack developer with 5 years experience building modern web applications using JavaScript frameworks and REST APIs.', NULL),

('James Taylor', 'james.taylor@techcorp.com', 'Backend Developer', 'Mid-Level', 
 'Backend developer specializing in Python and Django. 4 years of experience in API development and database design.', NULL),

('Maria Garcia', 'maria.garcia@techcorp.com', 'Frontend Developer', 'Mid-Level', 
 'Creative frontend developer with an eye for design. 4 years working with React, TypeScript, and modern CSS frameworks.', NULL),

('Christopher Lee', 'christopher.lee@techcorp.com', 'DevOps Engineer', 'Mid-Level', 
 'DevOps engineer focused on automation and containerization. 5 years experience with Docker, Jenkins, and AWS.', NULL),

('Amanda White', 'amanda.white@techcorp.com', 'Data Engineer', 'Mid-Level', 
 'Data engineer building ETL pipelines and analytics systems. 4 years working with Python, SQL, and big data technologies.', NULL),

('Daniel Brown', 'daniel.brown@techcorp.com', 'Mobile Developer', 'Mid-Level', 
 'Mobile app developer creating native iOS and Android applications. 5 years of mobile development experience.', NULL),

('Jessica Harris', 'jessica.harris@techcorp.com', 'QA Engineer', 'Mid-Level', 
 'Quality assurance engineer with strong automation skills. 4 years ensuring software quality through comprehensive testing.', NULL),

('Ryan Clark', 'ryan.clark@techcorp.com', 'Full Stack Developer', 'Mid-Level', 
 'Versatile developer comfortable with both frontend and backend technologies. 5 years building web applications.', NULL),
('Sophia Rodriguez', 'sophia.rodriguez@techcorp.com', 'Junior Frontend Developer', 'Junior', 
 'Enthusiastic frontend developer eager to learn and grow. 2 years experience with HTML, CSS, JavaScript, and React.', NULL),

('Ethan Miller', 'ethan.miller@techcorp.com', 'Junior Backend Developer', 'Junior', 
 'Junior backend developer with strong foundation in Python and SQL. 1.5 years of professional experience.', NULL),

('Olivia Moore', 'olivia.moore@techcorp.com', 'Junior Full Stack Developer', 'Junior', 
 'Recent graduate with 1 year experience building full-stack applications. Passionate about learning new technologies.', NULL),

('William Jackson', 'william.jackson@techcorp.com', 'Junior DevOps Engineer', 'Junior', 
 'Entry-level DevOps engineer learning infrastructure automation and cloud technologies. 1 year of hands-on experience.', NULL),

('Emma Thomas', 'emma.thomas@techcorp.com', 'Junior Developer', 'Junior', 
 'Recent bootcamp graduate with strong foundation in web development. Eager to contribute and learn from experienced developers.', NULL);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(1, (SELECT id FROM skills WHERE skill_name = 'Leadership'), 'Expert', 15.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Project Management'), 'Expert', 15.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Stakeholder Management'), 'Expert', 15.0),
(1, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Expert', 10.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Azure'), 'Advanced', 8.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Expert', 12.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Expert', 15.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced', 10.0),
(1, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Expert', 12.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(2, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Expert', 10.0),
(2, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Expert', 7.0),
(2, (SELECT id FROM skills WHERE skill_name = 'React'), 'Expert', 8.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Expert', 9.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Express.js'), 'Expert', 8.0),
(2, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Advanced', 6.0),
(2, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Advanced', 7.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced', 5.0),
(2, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Advanced', 6.0),
(2, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Expert', 9.0),
(2, (SELECT id FROM skills WHERE skill_name = 'GraphQL'), 'Advanced', 4.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Expert', 10.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Advanced', 8.0),
(2, (SELECT id FROM skills WHERE skill_name = 'Mentoring'), 'Advanced', 5.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(3, (SELECT id FROM skills WHERE skill_name = 'DevOps'), 'Expert', 12.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Expert', 10.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Expert', 8.0),
(3, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Expert', 11.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Azure'), 'Advanced', 6.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Terraform'), 'Expert', 7.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Ansible'), 'Advanced', 6.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Jenkins'), 'Expert', 9.0),
(3, (SELECT id FROM skills WHERE skill_name = 'GitLab CI/CD'), 'Advanced', 5.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced', 8.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Expert', 12.0),
(3, (SELECT id FROM skills WHERE skill_name = 'Leadership'), 'Advanced', 5.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(4, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Expert', 9.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Django'), 'Expert', 8.0),
(4, (SELECT id FROM skills WHERE skill_name = 'FastAPI'), 'Advanced', 4.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Advanced', 6.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Spring Boot'), 'Advanced', 5.0),
(4, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Expert', 8.0),
(4, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Advanced', 5.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Redis'), 'Advanced', 4.0),
(4, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Expert', 9.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Advanced', 6.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced', 5.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Expert', 9.0),
(4, (SELECT id FROM skills WHERE skill_name = 'Problem Solving'), 'Expert', 9.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(5, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Expert', 11.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Azure'), 'Expert', 9.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Expert', 10.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Expert', 11.0),
(5, (SELECT id FROM skills WHERE skill_name = 'C#'), 'Advanced', 7.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced', 8.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Spring Boot'), 'Expert', 9.0),
(5, (SELECT id FROM skills WHERE skill_name = 'ASP.NET Core'), 'Advanced', 6.0),
(5, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Expert', 10.0),
(5, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Advanced', 6.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Advanced', 5.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Terraform'), 'Advanced', 4.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Leadership'), 'Advanced', 7.0),
(5, (SELECT id FROM skills WHERE skill_name = 'Stakeholder Management'), 'Expert', 10.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(6, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Expert', 8.0),
(6, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Expert', 6.0),
(6, (SELECT id FROM skills WHERE skill_name = 'React'), 'Expert', 7.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Vue.js'), 'Advanced', 5.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Next.js'), 'Advanced', 4.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Angular'), 'Intermediate', 3.0),
(6, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Advanced', 6.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Figma'), 'Advanced', 5.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Expert', 8.0),
(6, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 6.0),
(6, (SELECT id FROM skills WHERE skill_name = 'GraphQL'), 'Advanced', 3.0),
(6, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Advanced', 6.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(7, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Expert', 10.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Spring Boot'), 'Expert', 8.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Kotlin'), 'Advanced', 4.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Expert', 7.0),
(7, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Expert', 9.0),
(7, (SELECT id FROM skills WHERE skill_name = 'MySQL'), 'Expert', 10.0),
(7, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Advanced', 5.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced', 6.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Intermediate', 3.0),
(7, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Advanced', 5.0),
(7, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Expert', 9.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Expert', 10.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Leadership'), 'Advanced', 4.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Mentoring'), 'Advanced', 5.0),
(7, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Advanced', 7.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(8, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Advanced', 5.0),
(8, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Intermediate', 3.0),
(8, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced', 4.0),
(8, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced', 4.0),
(8, (SELECT id FROM skills WHERE skill_name = 'Express.js'), 'Advanced', 4.0),
(8, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Intermediate', 3.0),
(8, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Intermediate', 2.0),
(8, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 4.0),
(8, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 5.0),
(8, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate', 2.0),
(8, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Intermediate', 3.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(9, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced', 4.0),
(9, (SELECT id FROM skills WHERE skill_name = 'Django'), 'Advanced', 3.5),
(9, (SELECT id FROM skills WHERE skill_name = 'FastAPI'), 'Intermediate', 2.0),
(9, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Advanced', 4.0),
(9, (SELECT id FROM skills WHERE skill_name = 'MySQL'), 'Intermediate', 3.0),
(9, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 4.0),
(9, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate', 2.0),
(9, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 4.0),
(9, (SELECT id FROM skills WHERE skill_name = 'SQL'), 'Advanced', 4.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(10, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Advanced', 4.0),
(10, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Intermediate', 2.5),
(10, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced', 4.0),
(10, (SELECT id FROM skills WHERE skill_name = 'Next.js'), 'Intermediate', 2.0),
(10, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Intermediate', 3.0),
(10, (SELECT id FROM skills WHERE skill_name = 'Figma'), 'Advanced', 3.5),
(10, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 4.0),
(10, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Intermediate', 3.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(11, (SELECT id FROM skills WHERE skill_name = 'DevOps'), 'Advanced', 5.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced', 5.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Intermediate', 2.5),
(11, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Advanced', 4.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Jenkins'), 'Advanced', 4.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Terraform'), 'Intermediate', 2.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate', 3.0),
(11, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 5.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(12, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced', 4.0),
(12, (SELECT id FROM skills WHERE skill_name = 'Data Science'), 'Advanced', 4.0),
(12, (SELECT id FROM skills WHERE skill_name = 'SQL'), 'Advanced', 4.0),
(12, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Advanced', 3.5),
(12, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Intermediate', 2.0),
(12, (SELECT id FROM skills WHERE skill_name = 'Elasticsearch'), 'Intermediate', 2.5),
(12, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Intermediate', 2.5),
(12, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate', 2.0),
(12, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 4.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(13, (SELECT id FROM skills WHERE skill_name = 'Mobile Development'), 'Advanced', 5.0),
(13, (SELECT id FROM skills WHERE skill_name = 'Swift'), 'Advanced', 4.0),
(13, (SELECT id FROM skills WHERE skill_name = 'Kotlin'), 'Advanced', 4.0),
(13, (SELECT id FROM skills WHERE skill_name = 'React'), 'Intermediate', 2.0),
(13, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Intermediate', 3.0),
(13, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 4.0),
(13, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 5.0),
(13, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Intermediate', 3.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(14, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Intermediate', 3.0),
(14, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate', 3.5),
(14, (SELECT id FROM skills WHERE skill_name = 'SQL'), 'Intermediate', 3.0),
(14, (SELECT id FROM skills WHERE skill_name = 'Postman'), 'Advanced', 4.0),
(14, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 4.0),
(14, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 4.0),
(14, (SELECT id FROM skills WHERE skill_name = 'JIRA'), 'Advanced', 4.0),
(14, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Advanced', 4.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(15, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Advanced', 5.0),
(15, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Intermediate', 3.0),
(15, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced', 4.0),
(15, (SELECT id FROM skills WHERE skill_name = 'Vue.js'), 'Intermediate', 2.0),
(15, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced', 4.5),
(15, (SELECT id FROM skills WHERE skill_name = 'Express.js'), 'Advanced', 4.0),
(15, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate', 2.0),
(15, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Intermediate', 3.0),
(15, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Advanced', 3.5),
(15, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced', 4.5),
(15, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate', 2.0),
(15, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Advanced', 5.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(16, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Intermediate', 2.0),
(16, (SELECT id FROM skills WHERE skill_name = 'React'), 'Intermediate', 1.5),
(16, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Beginner', 1.0),
(16, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Intermediate', 2.0),
(16, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Beginner', 1.5),
(16, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Beginner', 1.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(17, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate', 1.5),
(17, (SELECT id FROM skills WHERE skill_name = 'Django'), 'Beginner', 1.0),
(17, (SELECT id FROM skills WHERE skill_name = 'SQL'), 'Intermediate', 1.5),
(17, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Beginner', 1.0),
(17, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Intermediate', 1.5),
(17, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Intermediate', 1.5);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(18, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Intermediate', 1.0),
(18, (SELECT id FROM skills WHERE skill_name = 'React'), 'Beginner', 1.0),
(18, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Beginner', 0.5),
(18, (SELECT id FROM skills WHERE skill_name = 'Express.js'), 'Beginner', 0.5),
(18, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Beginner', 0.5),
(18, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Intermediate', 1.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(19, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Beginner', 1.0),
(19, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Beginner', 0.5),
(19, (SELECT id FROM skills WHERE skill_name = 'Jenkins'), 'Beginner', 1.0),
(19, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Beginner', 1.0),
(19, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Intermediate', 1.0);

INSERT INTO personnel_skills (personnel_id, skill_id, proficiency_level, years_of_experience) VALUES
(20, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Beginner', 1.0),
(20, (SELECT id FROM skills WHERE skill_name = 'React'), 'Beginner', 0.5),
(20, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Beginner', 0.5),
(20, (SELECT id FROM skills WHERE skill_name = 'Git'), 'Beginner', 1.0);

INSERT INTO projects (project_name, description, start_date, end_date, status) VALUES
('E-Commerce Platform Redesign', 
 'Complete overhaul of the company e-commerce platform with modern React frontend, Node.js backend, and cloud deployment. Focus on performance, user experience, and scalability.',
 '2025-01-15', '2025-08-30', 'Active'),

('Mobile Banking App', 
 'Native mobile application for iOS and Android providing comprehensive banking services. Requires high security standards and seamless UX.',
 '2025-02-01', '2025-10-31', 'Active'),

('Cloud Migration Initiative', 
 'Migrate legacy on-premise systems to AWS cloud infrastructure. Includes containerization, orchestration, and CI/CD pipeline setup.',
 '2025-01-01', '2025-06-30', 'Active'),
('AI-Powered Analytics Dashboard', 
 'Machine learning-based analytics dashboard for business intelligence. Real-time data processing and visualization with predictive insights.',
 '2025-03-01', '2025-12-31', 'Planning'),

('Microservices Architecture Refactoring', 
 'Break down monolithic application into microservices architecture. Implement API gateway, service mesh, and distributed tracing.',
 '2025-04-01', '2026-03-31', 'Planning'),

('Customer Portal Enhancement', 
 'Enhance customer-facing portal with new features including live chat, document management, and personalized dashboards.',
 '2025-03-15', '2025-09-30', 'Planning'),
('Payment Gateway Integration', 
 'Successfully integrated multiple payment providers with robust error handling and transaction monitoring.',
 '2024-06-01', '2024-12-15', 'Completed'),

('Security Audit and Hardening', 
 'Comprehensive security audit and implementation of security best practices across all systems.',
 '2024-08-01', '2024-11-30', 'Completed'),
('Blockchain Integration POC', 
 'Proof of concept for blockchain-based transaction verification. On hold pending stakeholder approval.',
 '2025-02-15', '2025-08-31', 'On Hold');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(1, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced'),
(1, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Intermediate'),
(1, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced'),
(1, (SELECT id FROM skills WHERE skill_name = 'Express.js'), 'Advanced'),
(1, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Intermediate'),
(1, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced'),
(1, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate'),
(1, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Intermediate'),
(1, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Intermediate'),
(1, (SELECT id FROM skills WHERE skill_name = 'Agile Methodology'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(2, (SELECT id FROM skills WHERE skill_name = 'Mobile Development'), 'Advanced'),
(2, (SELECT id FROM skills WHERE skill_name = 'Swift'), 'Advanced'),
(2, (SELECT id FROM skills WHERE skill_name = 'Kotlin'), 'Advanced'),
(2, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced'),
(2, (SELECT id FROM skills WHERE skill_name = 'Cybersecurity'), 'Intermediate'),
(2, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Intermediate'),
(2, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(3, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Expert'),
(3, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced'),
(3, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Advanced'),
(3, (SELECT id FROM skills WHERE skill_name = 'Terraform'), 'Advanced'),
(3, (SELECT id FROM skills WHERE skill_name = 'DevOps'), 'Expert'),
(3, (SELECT id FROM skills WHERE skill_name = 'Jenkins'), 'Advanced'),
(3, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate'),
(3, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(4, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced'),
(4, (SELECT id FROM skills WHERE skill_name = 'Machine Learning'), 'Advanced'),
(4, (SELECT id FROM skills WHERE skill_name = 'Data Science'), 'Advanced'),
(4, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced'),
(4, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Intermediate'),
(4, (SELECT id FROM skills WHERE skill_name = 'FastAPI'), 'Intermediate'),
(4, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(5, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Expert'),
(5, (SELECT id FROM skills WHERE skill_name = 'Spring Boot'), 'Expert'),
(5, (SELECT id FROM skills WHERE skill_name = 'Microservices'), 'Expert'),
(5, (SELECT id FROM skills WHERE skill_name = 'Kubernetes'), 'Advanced'),
(5, (SELECT id FROM skills WHERE skill_name = 'Docker'), 'Advanced'),
(5, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Advanced'),
(5, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(6, (SELECT id FROM skills WHERE skill_name = 'React'), 'Advanced'),
(6, (SELECT id FROM skills WHERE skill_name = 'TypeScript'), 'Intermediate'),
(6, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced'),
(6, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Advanced'),
(6, (SELECT id FROM skills WHERE skill_name = 'MongoDB'), 'Intermediate'),
(6, (SELECT id FROM skills WHERE skill_name = 'UI/UX Design'), 'Advanced');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(7, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced'),
(7, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Advanced'),
(7, (SELECT id FROM skills WHERE skill_name = 'REST API'), 'Expert'),
(7, (SELECT id FROM skills WHERE skill_name = 'PostgreSQL'), 'Advanced'),
(7, (SELECT id FROM skills WHERE skill_name = 'Cybersecurity'), 'Advanced');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(8, (SELECT id FROM skills WHERE skill_name = 'Cybersecurity'), 'Expert'),
(8, (SELECT id FROM skills WHERE skill_name = 'DevOps'), 'Advanced'),
(8, (SELECT id FROM skills WHERE skill_name = 'AWS'), 'Advanced'),
(8, (SELECT id FROM skills WHERE skill_name = 'Python'), 'Intermediate'),
(8, (SELECT id FROM skills WHERE skill_name = 'Java'), 'Intermediate');

INSERT INTO project_required_skills (project_id, skill_id, minimum_proficiency) VALUES
(9, (SELECT id FROM skills WHERE skill_name = 'Blockchain'), 'Advanced'),
(9, (SELECT id FROM skills WHERE skill_name = 'JavaScript'), 'Advanced'),
(9, (SELECT id FROM skills WHERE skill_name = 'Node.js'), 'Advanced'),
(9, (SELECT id FROM skills WHERE skill_name = 'Cybersecurity'), 'Intermediate');

INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
(1, 2, 80, '2025-01-15', '2025-08-30', 'Tech Lead'),
(1, 8, 100, '2025-01-15', '2025-08-30', 'Full Stack Developer'),
(1, 10, 100, '2025-01-15', '2025-08-30', 'Frontend Developer'),
(1, 16, 100, '2025-01-20', '2025-08-30', 'Junior Frontend Developer'),
(1, 9, 60, '2025-02-01', '2025-08-30', 'Backend Support');

INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
(2, 13, 100, '2025-02-01', '2025-10-31', 'Lead Mobile Developer'),
(2, 6, 50, '2025-02-01', '2025-06-30', 'UI/UX Consultant'),
(2, 4, 40, '2025-02-15', '2025-10-31', 'Backend API Developer');

INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
(3, 3, 90, '2025-01-01', '2025-06-30', 'DevOps Lead'),
(3, 11, 100, '2025-01-01', '2025-06-30', 'DevOps Engineer'),
(3, 5, 50, '2025-01-15', '2025-05-31', 'Architecture Consultant'),
(3, 19, 80, '2025-01-15', '2025-06-30', 'Junior DevOps Engineer');

INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
(7, 4, 70, '2024-06-01', '2024-12-15', 'Backend Lead'),
(7, 2, 50, '2024-06-01', '2024-10-15', 'Full Stack Developer');

INSERT INTO project_allocations (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project) VALUES
(8, 1, 30, '2024-08-01', '2024-11-30', 'Security Oversight'),
(8, 3, 60, '2024-08-01', '2024-11-30', 'Infrastructure Security');

INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage, notes) VALUES
(1, '2025-01-01', '2025-12-31', 70, 'CTO - Reserved time for strategic initiatives'),
(7, '2025-01-01', '2025-06-30', 100, 'Available for new projects'),
(12, '2025-01-01', '2025-12-31', 100, 'Available for data projects'),
(14, '2025-01-01', '2025-12-31', 100, 'Available for QA assignments'),
(15, '2025-01-01', '2025-06-30', 100, 'Available for full stack projects'),
(17, '2025-01-01', '2025-12-31', 100, 'Available for backend work'),
(18, '2025-01-01', '2025-12-31', 100, 'Available for any projects'),
(20, '2025-01-01', '2025-12-31', 100, 'Available for junior-level tasks');

INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage, notes) VALUES
(2, '2025-01-15', '2025-08-30', 20, 'Allocated to E-Commerce project - minimal capacity'),
(3, '2025-01-01', '2025-06-30', 10, 'Leading Cloud Migration - very limited availability'),
(4, '2025-02-15', '2025-10-31', 60, 'Supporting Mobile Banking App'),
(5, '2025-01-15', '2025-05-31', 50, 'Consulting on Cloud Migration'),
(6, '2025-02-01', '2025-06-30', 50, 'Part-time on Mobile Banking UI'),
(8, '2025-01-15', '2025-08-30', 0, 'Fully allocated to E-Commerce project'),
(9, '2025-02-01', '2025-08-30', 40, 'Supporting E-Commerce backend'),
(10, '2025-01-15', '2025-08-30', 0, 'Fully allocated to E-Commerce project'),
(11, '2025-01-01', '2025-06-30', 0, 'Fully allocated to Cloud Migration'),
(13, '2025-02-01', '2025-10-31', 0, 'Fully allocated to Mobile Banking App'),
(16, '2025-01-20', '2025-08-30', 0, 'Fully allocated to E-Commerce project'),
(19, '2025-01-15', '2025-06-30', 20, 'Supporting Cloud Migration');

INSERT INTO personnel_availability (personnel_id, start_date, end_date, availability_percentage, notes) VALUES
(2, '2025-07-01', '2025-07-14', 0, 'Vacation - Summer break'),
(6, '2025-08-01', '2025-08-15', 0, 'Vacation - Family trip'),
(12, '2025-06-15', '2025-06-30', 50, 'Conference attendance and training'),
(15, '2025-05-01', '2025-05-15', 0, 'Vacation - Spring break');

SELECT '=== SEED DATA SUMMARY ===' AS '';
SELECT COUNT(*) AS 'Total Users' FROM users;
SELECT role, COUNT(*) AS 'Count' FROM users GROUP BY role;
SELECT '---' AS '';
SELECT COUNT(*) AS 'Total Personnel' FROM personnel;
SELECT experience_level, COUNT(*) AS 'Count' FROM personnel GROUP BY experience_level;
SELECT '---' AS '';
SELECT COUNT(*) AS 'Total Skills' FROM skills;
SELECT category, COUNT(*) AS 'Count' FROM skills GROUP BY category;
SELECT '---' AS '';
SELECT COUNT(*) AS 'Total Projects' FROM projects;
SELECT status, COUNT(*) AS 'Count' FROM projects GROUP BY status;
SELECT '---' AS '';
SELECT COUNT(*) AS 'Total Project Allocations' FROM project_allocations;
SELECT COUNT(*) AS 'Total Availability Records' FROM personnel_availability;
SELECT '---' AS '';
SELECT 
    CONCAT(ROUND(COUNT(DISTINCT ps.personnel_id) / (SELECT COUNT(*) FROM personnel) * 100, 1), '%') AS 'Personnel with Skills Assigned',
    CONCAT(ROUND(AVG(skill_count), 1), ' skills') AS 'Average Skills per Person'
FROM (
    SELECT personnel_id, COUNT(*) AS skill_count 
    FROM personnel_skills 
    GROUP BY personnel_id
) AS ps;

SELECT '=== SAMPLE QUERIES TO TEST SYSTEM ===' AS '';

SELECT '1. Find Senior React Developers:' AS '';
SELECT p.name, p.role_title, ps.proficiency_level, ps.years_of_experience
FROM personnel p
JOIN personnel_skills ps ON p.id = ps.personnel_id
JOIN skills s ON ps.skill_id = s.id
WHERE p.experience_level = 'Senior'
AND s.skill_name = 'React'
ORDER BY ps.proficiency_level DESC, ps.years_of_experience DESC;

SELECT '---' AS '';

SELECT '2. Current Project Allocations:' AS '';
SELECT 
    proj.project_name,
    proj.status,
    p.name AS personnel_name,
    pa.role_in_project,
    pa.allocation_percentage AS 'Allocation %'
FROM project_allocations pa
JOIN projects proj ON pa.project_id = proj.id
JOIN personnel p ON pa.personnel_id = p.id
WHERE proj.status IN ('Active', 'Planning')
ORDER BY proj.project_name, pa.allocation_percentage DESC;

SELECT '---' AS '';

SELECT '3. Currently Available Personnel (>50% capacity):' AS '';
SELECT 
    p.name,
    p.role_title,
    p.experience_level,
    pav.availability_percentage AS 'Availability %',
    pav.notes
FROM personnel_availability pav
JOIN personnel p ON pav.personnel_id = p.id
WHERE pav.availability_percentage > 50
AND pav.start_date <= CURDATE()
AND pav.end_date >= CURDATE()
ORDER BY pav.availability_percentage DESC, p.experience_level DESC;

SELECT '=== SEED DATA LOADED SUCCESSFULLY ===' AS '';
