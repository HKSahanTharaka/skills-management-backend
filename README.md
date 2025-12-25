# Skills & Resource Management System - Backend

## Overview

This backend system helps organizations manage their team members' skills and efficiently allocate them to projects. Think of it as a smart database that tracks who knows what, what projects need which skills, and who's available to work when. It matches the right people to the right projects based on their skills, experience level, and current availability. The system also includes advanced features for tracking personnel availability over time periods and managing project allocations, preventing the common problem of over-allocating team members to multiple projects.

## Technology Stack

- **Node.js** v18.x or higher
- **Express.js** - Web framework for building the REST API
- **MySQL 8.0** - Relational database for storing all data
- **JWT Authentication** - Secure token-based authentication
- **Jest** - Testing framework with coverage reports
- **Nodemon** - Development tool for auto-restarting server

## Prerequisites

Before you start, make sure you have these installed on your machine:

1. **Node.js** (v18.x or higher) - [Download here](https://nodejs.org/)
   - To check if you have it: `node --version`
   
2. **MySQL 8.0** - [Download here](https://dev.mysql.com/downloads/mysql/)
   - To check if you have it: `mysql --version`
   
3. **npm** (comes with Node.js) or **yarn**
   - To check: `npm --version`

4. **Git** (optional, for cloning)
   - To check: `git --version`

## Installation Steps

### 1. Clone the Repository

If you have the repository URL:

```bash
git clone https://github.com/HKSahanTharaka/skills-management-backend.git
cd skills-management-backend
```

Or if you already have the code, just navigate to the project folder:

```bash
cd skills-management-backend
```

### 2. Install Dependencies

Install all the Node.js packages needed for the project:

```bash
npm install
```

This will read `package.json` and install all dependencies listed there (Express, MySQL2, JWT, etc.).

### 3. Database Setup

First, make sure your MySQL server is running. Then create the database and tables:

**Option A: Using MySQL Command Line**

```bash
mysql -u root -p
```

Then inside MySQL:

```sql
source database/schema.sql
```

**Option B: Using MySQL Workbench or another GUI**

1. Open your MySQL GUI tool
2. Create a new connection to your MySQL server
3. Open the file `database/schema.sql`
4. Execute the entire script

The schema will:
- Create a database called `skills_management`
- Create all necessary tables (users, personnel, skills, projects, etc.)
- Insert some sample skills data for testing

**Option C: Using command line directly**

```bash
mysql -u root -p < database/schema.sql
```

### 4. Environment Configuration

Create a `.env` file in the root directory of the project. This file stores sensitive configuration that shouldn't be committed to version control.

Create `.env`:

```bash
# On Windows (PowerShell)
New-Item .env

# On Windows (CMD)
type nul > .env

# On Linux/Mac
touch .env
```

Then open `.env` and add these variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=skills_management
DB_PORT=3306
DB_SSL=false

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Replace `your_mysql_password_here` with your actual MySQL root password
- Replace `your_super_secret_jwt_key_change_this_in_production` with a strong random string (you can generate one online or use a password generator)
- If your MySQL password is empty, leave `DB_PASSWORD=` blank
- The `.env` file is already in `.gitignore`, so it won't be committed to git

### 5. Run the Application

**Development Mode** (with auto-restart on file changes):

```bash
npm run dev
```

**Production Mode** (standard start):

```bash
npm start
```

You should see output like:
```
Server is running on port 5000
Database connection established successfully
Connection ID: 123
Database: skills_management
```

To test if it's working, open your browser or use curl:

```bash
curl http://localhost:5000/health
```

You should get a JSON response confirming the server is running.

## API Endpoints

The base URL for all API endpoints is: `http://localhost:5000/api`

### Authentication

These endpoints don't require authentication:

- **POST** `/api/auth/register` - Register a new user account
  - Body: `{ "email": "user@example.com", "password": "password123", "role": "user" }`
  
- **POST** `/api/auth/login` - Login and receive JWT token
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Returns: JWT token to use in Authorization header for other requests

**Note:** All other endpoints require authentication. Include the JWT token in the request header:
```
Authorization: Bearer <your_jwt_token_here>
```

### Personnel Management

- **GET** `/api/personnel` - Get all personnel (supports filtering, search, pagination)
  - Query params: `experience_level`, `role_title`, `search`, `page`, `limit`
  
- **GET** `/api/personnel/:id` - Get a specific personnel by ID
  
- **POST** `/api/personnel` - Create a new personnel record
  - Body: `{ "name": "John Doe", "email": "john@example.com", "role_title": "Software Engineer", "experience_level": "Senior", ... }`
  
- **PUT** `/api/personnel/:id` - Update personnel information
  
- **DELETE** `/api/personnel/:id` - Delete a personnel record
  
- **GET** `/api/personnel/:id/skills` - Get all skills for a personnel

### Skills Management

- **GET** `/api/skills` - Get all skills (supports filtering by category, search, pagination)
  - Query params: `category`, `search`, `page`, `limit`
  
- **GET** `/api/skills/:id` - Get a specific skill by ID
  
- **POST** `/api/skills` - Create a new skill
  - Body: `{ "skill_name": "React", "category": "Framework", "description": "..." }`
  
- **PUT** `/api/skills/:id` - Update a skill
  
- **DELETE** `/api/skills/:id` - Delete a skill

### Personnel Skills

- **POST** `/api/personnel/:id/skills` - Assign a skill to personnel
  - Body: `{ "skill_id": 1, "proficiency_level": "Advanced", "years_of_experience": 3.5 }`
  
- **PUT** `/api/personnel/:personnelId/skills/:skillId` - Update skill proficiency level
  
- **DELETE** `/api/personnel/:personnelId/skills/:skillId` - Remove a skill from personnel

### Projects

- **GET** `/api/projects` - Get all projects (supports filtering by status, search, pagination)
  
- **GET** `/api/projects/:id` - Get a specific project with its required skills
  
- **POST** `/api/projects` - Create a new project
  - Body: `{ "project_name": "E-commerce Platform", "description": "...", "start_date": "2024-01-01", "end_date": "2024-06-30", "status": "Planning" }`
  
- **PUT** `/api/projects/:id` - Update a project
  
- **DELETE** `/api/projects/:id` - Delete a project
  
- **POST** `/api/projects/:id/required-skills` - Add a required skill to a project
  - Body: `{ "skill_id": 1, "minimum_proficiency": "Advanced" }`

### Matching

- **POST** `/api/matching/find-personnel` - Find personnel matching project requirements
  - Body: `{ "project_id": 1, "additional_filters": { "experience_level": "Senior" } }`
  - Returns: List of matching personnel with match scores
  
- **GET** `/api/matching/project/:id/suggestions` - Get personnel suggestions for a project

### Availability

- **GET** `/api/availability/:personnelId` - Get availability periods for a personnel
  
- **POST** `/api/availability` - Set an availability period
  - Body: `{ "personnel_id": 1, "start_date": "2024-01-01", "end_date": "2024-03-31", "availability_percentage": 100, "notes": "Fully available" }`
  
- **PUT** `/api/availability/:id` - Update an availability period
  
- **DELETE** `/api/availability/:id` - Delete an availability period

### Allocations

- **GET** `/api/allocations/personnel/:id` - Get all allocations for a personnel
  
- **GET** `/api/allocations/project/:id` - Get all allocations for a project
  
- **POST** `/api/allocations` - Create a project allocation
  - Body: `{ "project_id": 1, "personnel_id": 1, "allocation_percentage": 100, "start_date": "2024-01-01", "end_date": "2024-06-30", "role_in_project": "Lead Developer" }`
  
- **PUT** `/api/allocations/:id` - Update an allocation
  
- **DELETE** `/api/allocations/:id` - Delete an allocation

For detailed API documentation with request/response examples, see `API Documentation.md`.

## Testing

The project uses Jest for testing with coverage reports.

**Run all tests:**

```bash
npm test
```

**Run tests in watch mode** (useful during development):

```bash
npm run test:watch
```

**Run only unit tests:**

```bash
npm run test:unit
```

**Run only integration tests:**

```bash
npm run test:integration
```

After running tests, you'll see a coverage report showing which parts of your code are tested. The coverage report is generated in the `coverage/` folder - open `coverage/lcov-report/index.html` in a browser to see a detailed view.

## Project Structure

Here's how the project is organized:

```
skills-management-backend/
├── src/
│   ├── app.js                 # Main Express app configuration
│   ├── config/
│   │   └── database.js        # Database connection pool setup
│   ├── controllers/           # Business logic for each feature
│   │   ├── auth.controller.js
│   │   ├── personnel.controller.js
│   │   ├── skill.controller.js
│   │   ├── project.controller.js
│   │   ├── matching.controller.js
│   │   ├── availability.controller.js
│   │   └── allocation.controller.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication middleware
│   │   └── errorHandler.js    # Global error handling
│   ├── models/                # Data models (if needed)
│   ├── routes/                # Route definitions
│   │   ├── auth.routes.js
│   │   ├── personnel.routes.js
│   │   ├── skill.routes.js
│   │   ├── project.routes.js
│   │   ├── matching.routes.js
│   │   ├── availability.routes.js
│   │   └── allocation.routes.js
│   ├── validators/            # Request validation rules
│   ├── queries/               # Complex database queries
│   └── utils/                 # Helper functions
├── database/
│   ├── schema.sql             # Database schema (tables, indexes)
│   └── queries/
│       └── complex_queries.sql # Complex SQL queries reference
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── coverage/                  # Test coverage reports (generated)
├── server.js                  # Entry point that starts the server
├── package.json               # Dependencies and scripts
└── README.md                  # This file!
```

**Design Philosophy:**

- **Controllers** handle the business logic and communicate with the database
- **Routes** define the endpoints and call the appropriate controllers
- **Middleware** handles cross-cutting concerns like authentication and error handling
- **Models** (if needed) define data structures
- **Validators** ensure incoming data is correct before processing
- **Database queries** are kept separate for complex operations

## Additional Feature: Availability & Allocation Tracking

### What Problem Does It Solve?

In real-world project management, you often run into these problems:
- "Is John available to work on Project X next month?"
- "We just assigned Sarah to three projects, but she's only available 50% next quarter!"
- "Who can we assign to this new project that starts in 2 weeks?"
- "What percentage of time is each team member spending on each project?"

This feature solves all of these by tracking two key things:

1. **Availability**: When team members are available to work and what percentage of their time (e.g., 100% available, 50% available due to other commitments, on leave, etc.)

2. **Allocations**: Which projects each person is actually assigned to, what percentage of their time is allocated to each project, and when those allocations start and end.

The system prevents over-allocation by checking if someone has enough availability before assigning them to a project, and it calculates remaining capacity so you know who has time for new projects.

### How It Works

**Availability Tracking:**
- Personnel can have multiple availability periods (e.g., "100% available from Jan-Mar", "50% available from Apr-Jun")
- Each period has a start date, end date, and availability percentage (0-100%)
- If no availability record exists, the system assumes 100% availability

**Allocation Tracking:**
- When you assign someone to a project, you create an allocation record
- The allocation specifies: project, personnel, allocation percentage (how much of their time), start date, end date, and their role in the project
- The system validates that:
  1. The person has enough availability for the requested period
  2. Their total allocations don't exceed 100% for any overlapping time period
  3. They're not already allocated to the same project for overlapping dates

**The Matching:**
- When finding personnel for a project, the system considers both skills AND availability
- You can filter by availability percentage in the matching endpoint
- The system calculates remaining capacity (availability - current allocations) to show who has time available

**Example Workflow:**
1. John sets his availability: 100% from January to March
2. You assign John to Project A: 50% allocation from Jan 15 to Mar 15
3. You try to assign John to Project B: 60% allocation from Feb 1 to Feb 28
4. The system calculates: 50% (Project A) + 60% (Project B) = 110% total allocation
5. System rejects the allocation with a conflict error - John is over-allocated!

### API Endpoints

See the "Availability" and "Allocations" sections above for the complete list of endpoints. The key endpoints are:

- `POST /api/availability` - Set when someone is available
- `GET /api/availability/:personnelId` - Check someone's availability
- `POST /api/allocations` - Assign someone to a project
- `GET /api/allocations/personnel/:id` - See all projects someone is assigned to
- `GET /api/allocations/project/:id` - See everyone assigned to a project

## Database Schema

The database consists of several interconnected tables:

**Core Tables:**
- **users** - User accounts for authentication (email, password, role)
- **personnel** - Team members (name, email, role_title, experience_level, bio)
- **skills** - Available skills in the system (skill_name, category, description)
- **personnel_skills** - Many-to-many relationship between personnel and skills (includes proficiency_level and years_of_experience)
- **projects** - Projects in the system (project_name, description, start_date, end_date, status)
- **project_required_skills** - Skills required for each project (project_id, skill_id, minimum_proficiency)

**Additional Feature Tables:**
- **personnel_availability** - When personnel are available (personnel_id, start_date, end_date, availability_percentage, notes)
- **project_allocations** - Project assignments (project_id, personnel_id, allocation_percentage, start_date, end_date, role_in_project)

**Key Relationships:**
- A personnel can have many skills (via personnel_skills)
- A skill can belong to many personnel (via personnel_skills)
- A project can require many skills (via project_required_skills)
- A personnel can have many availability periods
- A personnel can be allocated to many projects
- A project can have many personnel allocations

All foreign keys use CASCADE deletes where appropriate (e.g., deleting a personnel deletes their skills, availability, and allocations).

## Known Issues / Future Improvements

**Current Limitations:**
- Availability conflict detection is somewhat simplified - it checks for overlapping periods but doesn't handle partial overlaps as precisely as it could in edge cases
- The matching algorithm could be enhanced with more sophisticated scoring (e.g., weighting skills by importance)
- No built-in email notifications for allocation changes or conflicts
- No bulk operations (e.g., assigning multiple people to a project at once)
- The system assumes allocations don't change mid-period - if you need to adjust someone's allocation percentage in the middle of an existing period, you need to delete and recreate

**Potential Future Enhancements:**
- Add notifications/email alerts when someone is over-allocated
- Implement skill gap analysis dashboard
- Add reporting/analytics endpoints (e.g., "resource utilization by month")
- Support for skill endorsements or certifications
- Add project timeline visualization data
- Implement soft deletes (archive instead of delete) for better data history
- Add API rate limiting for production
- Add request logging and audit trails
- Support for multiple organizations/tenants
- Add GraphQL API alongside REST

## Troubleshooting

**Database connection errors:**
- Check that MySQL server is running: `mysql --version` or check MySQL service status
- Verify your `.env` file has correct database credentials
- Make sure the database `skills_management` exists (run the schema.sql if needed)
- Check if MySQL is listening on the correct port (default 3306)

**Port already in use:**
- Change `PORT` in `.env` to a different number (e.g., 5001, 3001)
- Or find what's using port 5000 and stop it

**JWT authentication errors:**
- Make sure `JWT_SECRET` is set in `.env`
- Check that you're including the token in the Authorization header: `Authorization: Bearer <token>`
- Make sure the token hasn't expired (default is 7 days)

**Module not found errors:**
- Run `npm install` again to make sure all dependencies are installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` fresh

**Tests failing:**
- Make sure the database is set up correctly
- Check that test database credentials (if using a separate test DB) are correct
- Some tests might need the database to be in a specific state

**Getting CORS errors from frontend:**
- Check that `FRONTEND_URL` in `.env` matches your frontend URL
- In development, you can temporarily set `FRONTEND_URL=*` to allow all origins (not recommended for production)

## Author

**H.K. Sahan Tharaka**

- GitHub: [@HKSahanTharaka](https://github.com/HKSahanTharaka)
- Repository: [skills-management-backend](https://github.com/HKSahanTharaka/skills-management-backend)

---

**Note:** This is a backend API. You'll need a frontend application to interact with it through a user interface. The API returns JSON data that can be consumed by any frontend framework (React, Vue, Angular, etc.) or mobile application.

