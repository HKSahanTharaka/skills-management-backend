# Skills Management API Documentation

This document describes all available endpoints for the Skills Management Backend API.

**Base URL**: `/api`

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Personnel Endpoints](#personnel-endpoints)
3. [Skills Endpoints](#skills-endpoints)
4. [Personnel Skills Endpoints](#personnel-skills-endpoints)
5. [Projects Endpoints](#projects-endpoints)
6. [Matching Endpoints](#matching-endpoints)
7. [Availability Endpoints](#availability-endpoints)
8. [Allocation Endpoints](#allocation-endpoints)

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "user"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

### POST /api/auth/login
Login user and receive authentication token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

## Personnel Endpoints

### GET /api/personnel
Get all personnel with optional filters.

**Query Parameters**:
- `experience_level` (optional): Filter by experience level (Junior, Mid-Level, Senior)
- `role_title` (optional): Filter by role title
- `search` (optional): Search by name or email
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role_title": "Software Engineer",
      "experience_level": "Senior",
      "profile_image_url": null,
      "bio": "Experienced developer",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/personnel/:id
Get a single personnel by ID.

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role_title": "Software Engineer",
  "experience_level": "Senior",
  "profile_image_url": null,
  "bio": "Experienced developer",
  "user_id": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Personnel not found"
}
```

---

### POST /api/personnel
Create a new personnel record.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role_title": "Software Engineer",
  "experience_level": "Senior",
  "profile_image_url": "https://example.com/image.jpg",
  "bio": "Experienced developer",
  "user_id": 1
}
```

**Response** (201 Created):
```json
{
  "message": "Personnel created successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_title": "Software Engineer",
    "experience_level": "Senior",
    "profile_image_url": "https://example.com/image.jpg",
    "bio": "Experienced developer",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/personnel/:id
Update an existing personnel record.

**Request Body** (all fields optional):
```json
{
  "name": "John Updated",
  "role_title": "Senior Software Engineer",
  "experience_level": "Senior",
  "bio": "Updated bio"
}
```

**Response** (200 OK):
```json
{
  "message": "Personnel updated successfully",
  "data": {
    "id": 1,
    "name": "John Updated",
    "email": "john@example.com",
    "role_title": "Senior Software Engineer",
    "experience_level": "Senior",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/personnel/:id
Delete a personnel record.

**Response** (200 OK):
```json
{
  "message": "Personnel deleted successfully"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Personnel not found"
}
```

---

### GET /api/personnel/:id/skills
Get all skills assigned to a personnel.

**Response** (200 OK):
```json
{
  "personnel_id": 1,
  "skills": [
    {
      "id": 1,
      "skill_id": 1,
      "skill_name": "React",
      "category": "Framework",
      "proficiency_level": "Advanced",
      "years_of_experience": 3.5,
      "assigned_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Skills Endpoints

### GET /api/skills
Get all skills with optional filters.

**Query Parameters**:
- `category` (optional): Filter by category (Programming Language, Framework, Tool, Soft Skill, Other)
- `search` (optional): Search by skill name
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "skill_name": "React",
      "category": "Framework",
      "description": "JavaScript library for building user interfaces",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/skills/:id
Get a single skill by ID.

**Response** (200 OK):
```json
{
  "id": 1,
  "skill_name": "React",
  "category": "Framework",
  "description": "JavaScript library for building user interfaces",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Skill not found"
}
```

---

### POST /api/skills
Create a new skill.

**Request Body**:
```json
{
  "skill_name": "Vue.js",
  "category": "Framework",
  "description": "Progressive JavaScript framework"
}
```

**Response** (201 Created):
```json
{
  "message": "Skill created successfully",
  "data": {
    "id": 2,
    "skill_name": "Vue.js",
    "category": "Framework",
    "description": "Progressive JavaScript framework",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/skills/:id
Update an existing skill.

**Request Body** (all fields optional):
```json
{
  "skill_name": "Vue.js 3",
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "message": "Skill updated successfully",
  "data": {
    "id": 2,
    "skill_name": "Vue.js 3",
    "category": "Framework",
    "description": "Updated description",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/skills/:id
Delete a skill.

**Response** (200 OK):
```json
{
  "message": "Skill deleted successfully"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Skill not found"
}
```

---

## Personnel Skills Endpoints

### POST /api/personnel/:id/skills
Assign a skill to personnel.

**Request Body**:
```json
{
  "skill_id": 1,
  "proficiency_level": "Advanced",
  "years_of_experience": 3.5
}
```

**Response** (201 Created):
```json
{
  "message": "Skill assigned to personnel successfully",
  "data": {
    "id": 1,
    "personnel_id": 1,
    "skill_id": 1,
    "skill_name": "React",
    "proficiency_level": "Advanced",
    "years_of_experience": 3.5,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response** (409 Conflict):
```json
{
  "error": "Skill already assigned to this personnel"
}
```

---

### PUT /api/personnel/:personnelId/skills/:skillId
Update skill proficiency level for personnel.

**Request Body**:
```json
{
  "proficiency_level": "Expert",
  "years_of_experience": 5.0
}
```

**Response** (200 OK):
```json
{
  "message": "Skill proficiency updated successfully",
  "data": {
    "id": 1,
    "personnel_id": 1,
    "skill_id": 1,
    "proficiency_level": "Expert",
    "years_of_experience": 5.0,
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/personnel/:personnelId/skills/:skillId
Remove a skill from personnel.

**Response** (200 OK):
```json
{
  "message": "Skill removed from personnel successfully"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Personnel skill assignment not found"
}
```

---

## Projects Endpoints

### GET /api/projects
Get all projects with optional filters.

**Query Parameters**:
- `status` (optional): Filter by status (Planning, Active, Completed, On Hold)
- `search` (optional): Search by project name
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "project_name": "E-commerce Platform",
      "description": "Building an e-commerce platform",
      "start_date": "2024-01-01",
      "end_date": "2024-06-30",
      "status": "Active",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/projects/:id
Get a single project by ID.

**Response** (200 OK):
```json
{
  "id": 1,
  "project_name": "E-commerce Platform",
  "description": "Building an e-commerce platform",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "status": "Active",
  "required_skills": [
    {
      "id": 1,
      "skill_id": 1,
      "skill_name": "React",
      "minimum_proficiency": "Advanced"
    }
  ],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

---

### POST /api/projects
Create a new project.

**Request Body**:
```json
{
  "project_name": "E-commerce Platform",
  "description": "Building an e-commerce platform",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "status": "Planning"
}
```

**Response** (201 Created):
```json
{
  "message": "Project created successfully",
  "data": {
    "id": 1,
    "project_name": "E-commerce Platform",
    "description": "Building an e-commerce platform",
    "start_date": "2024-01-01",
    "end_date": "2024-06-30",
    "status": "Planning",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/projects/:id
Update an existing project.

**Request Body** (all fields optional):
```json
{
  "project_name": "Updated Project Name",
  "status": "Active",
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "message": "Project updated successfully",
  "data": {
    "id": 1,
    "project_name": "Updated Project Name",
    "status": "Active",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/projects/:id
Delete a project.

**Response** (200 OK):
```json
{
  "message": "Project deleted successfully"
}
```

---

### POST /api/projects/:id/required-skills
Add a required skill to a project.

**Request Body**:
```json
{
  "skill_id": 1,
  "minimum_proficiency": "Advanced"
}
```

**Response** (201 Created):
```json
{
  "message": "Required skill added to project successfully",
  "data": {
    "id": 1,
    "project_id": 1,
    "skill_id": 1,
    "skill_name": "React",
    "minimum_proficiency": "Advanced",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Matching Endpoints

### POST /api/matching/find-personnel
Find personnel matching project requirements.

**Request Body**:
```json
{
  "project_id": 1,
  "additional_filters": {
    "experience_level": "Senior",
    "availability_percentage": 50
  }
}
```

**Response** (200 OK):
```json
{
  "project_id": 1,
  "matches": [
    {
      "personnel_id": 1,
      "name": "John Doe",
      "match_score": 95,
      "matching_skills": [
        {
          "skill_id": 1,
          "skill_name": "React",
          "required_proficiency": "Advanced",
          "personnel_proficiency": "Expert",
          "match_status": "exceeds"
        }
      ],
      "missing_skills": [],
      "experience_level": "Senior"
    }
  ]
}
```

---

### GET /api/matching/project/:id/suggestions
Get personnel suggestions for a project based on required skills.

**Response** (200 OK):
```json
{
  "project_id": 1,
  "suggestions": [
    {
      "personnel_id": 1,
      "name": "John Doe",
      "match_percentage": 95,
      "skills_match": 5,
      "skills_missing": 0,
      "skills_partial": 0,
      "details": {
        "perfect_matches": 5,
        "overqualified": 2,
        "missing_skills": []
      }
    }
  ]
}
```

---

## Availability Endpoints

### GET /api/availability/:personnelId
Get availability periods for a personnel.

**Response** (200 OK):
```json
{
  "personnel_id": 1,
  "availability": [
    {
      "id": 1,
      "start_date": "2024-01-01",
      "end_date": "2024-03-31",
      "availability_percentage": 100,
      "notes": "Fully available",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/availability
Set an availability period for personnel.

**Request Body**:
```json
{
  "personnel_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "availability_percentage": 100,
  "notes": "Fully available"
}
```

**Response** (201 Created):
```json
{
  "message": "Availability period created successfully",
  "data": {
    "id": 1,
    "personnel_id": 1,
    "start_date": "2024-01-01",
    "end_date": "2024-03-31",
    "availability_percentage": 100,
    "notes": "Fully available",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/availability/:id
Update an availability period.

**Request Body** (all fields optional):
```json
{
  "start_date": "2024-02-01",
  "end_date": "2024-04-30",
  "availability_percentage": 75,
  "notes": "Updated availability"
}
```

**Response** (200 OK):
```json
{
  "message": "Availability period updated successfully",
  "data": {
    "id": 1,
    "personnel_id": 1,
    "start_date": "2024-02-01",
    "end_date": "2024-04-30",
    "availability_percentage": 75,
    "notes": "Updated availability",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/availability/:id
Delete an availability period.

**Response** (200 OK):
```json
{
  "message": "Availability period deleted successfully"
}
```

---

## Allocation Endpoints

### GET /api/allocations/personnel/:id
Get all allocations for a specific personnel.

**Response** (200 OK):
```json
{
  "personnel_id": 1,
  "allocations": [
    {
      "id": 1,
      "project_id": 1,
      "project_name": "E-commerce Platform",
      "allocation_percentage": 100,
      "start_date": "2024-01-01",
      "end_date": "2024-06-30",
      "role_in_project": "Lead Developer",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/allocations/project/:id
Get all allocations for a specific project.

**Response** (200 OK):
```json
{
  "project_id": 1,
  "allocations": [
    {
      "id": 1,
      "personnel_id": 1,
      "personnel_name": "John Doe",
      "allocation_percentage": 100,
      "start_date": "2024-01-01",
      "end_date": "2024-06-30",
      "role_in_project": "Lead Developer",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/allocations
Create a new project allocation.

**Request Body**:
```json
{
  "project_id": 1,
  "personnel_id": 1,
  "allocation_percentage": 100,
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "role_in_project": "Lead Developer"
}
```

**Response** (201 Created):
```json
{
  "message": "Allocation created successfully",
  "data": {
    "id": 1,
    "project_id": 1,
    "personnel_id": 1,
    "allocation_percentage": 100,
    "start_date": "2024-01-01",
    "end_date": "2024-06-30",
    "role_in_project": "Lead Developer",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/allocations/:id
Update an existing allocation.

**Request Body** (all fields optional):
```json
{
  "allocation_percentage": 75,
  "end_date": "2024-07-31",
  "role_in_project": "Senior Developer"
}
```

**Response** (200 OK):
```json
{
  "message": "Allocation updated successfully",
  "data": {
    "id": 1,
    "project_id": 1,
    "personnel_id": 1,
    "allocation_percentage": 75,
    "start_date": "2024-01-01",
    "end_date": "2024-07-31",
    "role_in_project": "Senior Developer",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### DELETE /api/allocations/:id
Delete an allocation.

**Response** (200 OK):
```json
{
  "message": "Allocation deleted successfully"
}
```

---

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Authentication Required**: All endpoints except `/api/auth/register` and `/api/auth/login` require authentication.

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": ["Field 'email' is required"]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Data Types

### Enums

**Experience Level**: `Junior`, `Mid-Level`, `Senior`

**Proficiency Level**: `Beginner`, `Intermediate`, `Advanced`, `Expert`

**Skill Category**: `Programming Language`, `Framework`, `Tool`, `Soft Skill`, `Other`

**Project Status**: `Planning`, `Active`, `Completed`, `On Hold`

**User Role**: `admin`, `manager`, `user`

---

## Notes

- All dates are in ISO 8601 format (YYYY-MM-DD)
- All timestamps are in ISO 8601 format with timezone (YYYY-MM-DDTHH:mm:ss.sssZ)
- Pagination defaults: `page=1`, `limit=10`
- Allocation percentage and availability percentage are integers between 0 and 100
- Years of experience is a decimal number (e.g., 3.5)

