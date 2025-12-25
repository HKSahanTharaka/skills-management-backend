# API Documentation

This document provides comprehensive documentation for all API endpoints in the Skills Management Backend.

**Base URL**: `http://localhost:5000/api`

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

### Register User

**Endpoint**: `POST /api/auth/register`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "user"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid email format, password too short, invalid role
  ```json
  {
    "success": false,
    "error": {
      "message": "Email and password are required"
    }
  }
  ```
- **409 Conflict**: Email already exists
  ```json
  {
    "success": false,
    "error": {
      "message": "Email already exists"
    }
  }
  ```

---

### Login

**Endpoint**: `POST /api/auth/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Error Responses**:
- **400 Bad Request**: Missing email or password
  ```json
  {
    "success": false,
    "error": {
      "message": "Email and password are required"
    }
  }
  ```
- **401 Unauthorized**: Invalid email or password
  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid email or password"
    }
  }
  ```

---

## Personnel Endpoints

### Get All Personnel

**Endpoint**: `GET /api/personnel`

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `experience_level` (optional): Filter by experience level. Values: `Junior`, `Mid-Level`, `Senior`
- `role_title` (optional): Filter by role title (exact match)
- `search` (optional): Search by name or email (case-insensitive partial match)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 10)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role_title": "Software Engineer",
      "experience_level": "Senior",
      "profile_image_url": null,
      "bio": "Experienced developer",
      "user_id": null,
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

**Error Responses**:
- **401 Unauthorized**: Missing or invalid token
- **500 Internal Server Error**: Server error

---

### Get Personnel by ID

**Endpoint**: `GET /api/personnel/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
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
}
```

**Error Responses**:
- **404 Not Found**: Personnel not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Create Personnel

**Endpoint**: `POST /api/personnel`

**Authentication**: Required (Bearer token)

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

**Required Fields**: `name`, `email`, `role_title`, `experience_level`

**Optional Fields**: `profile_image_url`, `bio`, `user_id`

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Personnel created successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_title": "Software Engineer",
    "experience_level": "Senior",
    "profile_image_url": "https://example.com/image.jpg",
    "bio": "Experienced developer",
    "user_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid email format, invalid experience_level
  ```json
  {
    "success": false,
    "error": {
      "message": "Missing required fields: name, email, role_title, and experience_level are required"
    }
  }
  ```
- **409 Conflict**: Email already exists
  ```json
  {
    "success": false,
    "error": {
      "message": "Email already exists"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Personnel

**Endpoint**: `PUT /api/personnel/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Request Body** (all fields optional):
```json
{
  "name": "John Updated",
  "role_title": "Senior Software Engineer",
  "experience_level": "Senior",
  "bio": "Updated bio"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Personnel updated successfully",
  "data": {
    "id": 1,
    "name": "John Updated",
    "email": "john@example.com",
    "role_title": "Senior Software Engineer",
    "experience_level": "Senior",
    "bio": "Updated bio",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request**: Invalid email format, invalid experience_level
- **404 Not Found**: Personnel not found
- **409 Conflict**: Email already exists (if updating email)
- **401 Unauthorized**: Missing or invalid token

---

### Delete Personnel

**Endpoint**: `DELETE /api/personnel/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Personnel deleted successfully"
}
```

**Error Responses**:
- **404 Not Found**: Personnel not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Get Personnel Skills

**Endpoint**: `GET /api/personnel/:id/skills`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "personnel_id": 1,
  "skills": [
    {
      "id": 1,
      "skill_id": 1,
      "skill_name": "React",
      "category": "Framework",
      "proficiency_level": "Advanced",
      "years_of_experience": 3.5,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses**:
- **404 Not Found**: Personnel not found
- **401 Unauthorized**: Missing or invalid token

---

## Skills Endpoints

### Get All Skills

**Endpoint**: `GET /api/skills`

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `category` (optional): Filter by category. Values: `Programming Language`, `Framework`, `Tool`, `Soft Skill`, `Other`
- `search` (optional): Search by skill name (case-insensitive partial match)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 10)

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **401 Unauthorized**: Missing or invalid token

---

### Get Skill by ID

**Endpoint**: `GET /api/skills/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Skill ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "skill_name": "React",
    "category": "Framework",
    "description": "JavaScript library for building user interfaces",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- **404 Not Found**: Skill not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Skill not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Create Skill

**Endpoint**: `POST /api/skills`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "skill_name": "Vue.js",
  "category": "Framework",
  "description": "Progressive JavaScript framework"
}
```

**Required Fields**: `skill_name`, `category`

**Optional Fields**: `description`

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid category
  ```json
  {
    "success": false,
    "error": {
      "message": "Missing required fields: skill_name and category are required"
    }
  }
  ```
- **409 Conflict**: Skill name already exists
  ```json
  {
    "success": false,
    "error": {
      "message": "Skill name already exists"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Skill

**Endpoint**: `PUT /api/skills/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Skill ID

**Request Body** (all fields optional):
```json
{
  "skill_name": "Vue.js 3",
  "description": "Updated description"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Invalid category
- **404 Not Found**: Skill not found
- **409 Conflict**: Skill name already exists (if updating skill_name)
- **401 Unauthorized**: Missing or invalid token

---

### Delete Skill

**Endpoint**: `DELETE /api/skills/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Skill ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Skill deleted successfully"
}
```

**Error Responses**:
- **404 Not Found**: Skill not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Skill not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

## Personnel Skills Endpoints

### Assign Skill to Personnel

**Endpoint**: `POST /api/personnel/:id/skills`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Request Body**:
```json
{
  "skill_id": 1,
  "proficiency_level": "Advanced",
  "years_of_experience": 3.5
}
```

**Required Fields**: `skill_id`, `proficiency_level`

**Optional Fields**: `years_of_experience` (default: 0)

**Proficiency Levels**: `Beginner`, `Intermediate`, `Advanced`, `Expert`

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid proficiency_level, invalid skill_id
- **404 Not Found**: Personnel or skill not found
- **409 Conflict**: Skill already assigned to this personnel
  ```json
  {
    "success": false,
    "error": {
      "message": "Skill already assigned to this personnel"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Skill Proficiency

**Endpoint**: `PUT /api/personnel/:personnelId/skills/:skillId`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `personnelId` (required): Personnel ID
- `skillId` (required): Skill ID

**Request Body**:
```json
{
  "proficiency_level": "Expert",
  "years_of_experience": 5.0
}
```

**Required Fields**: At least one of `proficiency_level` or `years_of_experience`

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Invalid proficiency_level
- **404 Not Found**: Personnel skill assignment not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel skill assignment not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Remove Skill from Personnel

**Endpoint**: `DELETE /api/personnel/:personnelId/skills/:skillId`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `personnelId` (required): Personnel ID
- `skillId` (required): Skill ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Skill removed from personnel successfully"
}
```

**Error Responses**:
- **404 Not Found**: Personnel skill assignment not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel skill assignment not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

## Projects Endpoints

### Get All Projects

**Endpoint**: `GET /api/projects`

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `status` (optional): Filter by status. Values: `Planning`, `Active`, `Completed`, `On Hold`
- `search` (optional): Search by project name (case-insensitive partial match)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 10)

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **401 Unauthorized**: Missing or invalid token

---

### Get Project by ID

**Endpoint**: `GET /api/projects/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
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
    "allocated_personnel": [
      {
        "id": 1,
        "personnel_id": 1,
        "personnel_name": "John Doe",
        "allocation_percentage": 100,
        "start_date": "2024-01-01",
        "end_date": "2024-06-30",
        "role_in_project": "Lead Developer"
      }
    ],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- **404 Not Found**: Project not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Project not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Create Project

**Endpoint**: `POST /api/projects`

**Authentication**: Required (Bearer token)

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

**Required Fields**: `project_name`, `start_date`, `end_date`

**Optional Fields**: `description`, `status` (default: `Planning`)

**Status Values**: `Planning`, `Active`, `Completed`, `On Hold`

**Date Format**: `YYYY-MM-DD`

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid date format, end_date must be after start_date, invalid status
  ```json
  {
    "success": false,
    "error": {
      "message": "Missing required fields: project_name, start_date, and end_date are required"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Project

**Endpoint**: `PUT /api/projects/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Request Body** (all fields optional):
```json
{
  "project_name": "Updated Project Name",
  "status": "Active",
  "description": "Updated description"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": 1,
    "project_name": "Updated Project Name",
    "status": "Active",
    "description": "Updated description",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request**: Invalid date format, end_date must be after start_date, invalid status
- **404 Not Found**: Project not found
- **401 Unauthorized**: Missing or invalid token

---

### Delete Project

**Endpoint**: `DELETE /api/projects/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses**:
- **404 Not Found**: Project not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Project not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Add Required Skill to Project

**Endpoint**: `POST /api/projects/:id/required-skills`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Request Body**:
```json
{
  "skill_id": 1,
  "minimum_proficiency": "Advanced"
}
```

**Required Fields**: `skill_id`, `minimum_proficiency`

**Proficiency Levels**: `Beginner`, `Intermediate`, `Advanced`, `Expert`

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid minimum_proficiency, invalid skill_id
- **404 Not Found**: Project or skill not found
- **409 Conflict**: Skill already added to project
  ```json
  {
    "success": false,
    "error": {
      "message": "Skill already added to this project"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

## Matching Endpoints

### Find Matching Personnel

**Endpoint**: `POST /api/matching/find-personnel`

**Authentication**: Required (Bearer token)

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

**Required Fields**: `project_id`

**Optional Fields**: `additional_filters` (object with `experience_level` and/or `availability_percentage`)

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing project_id, project has no required skills
  ```json
  {
    "success": false,
    "error": {
      "message": "project_id is required"
    }
  }
  ```
- **404 Not Found**: Project not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Project not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Get Personnel Suggestions for Project

**Endpoint**: `GET /api/matching/project/:id/suggestions`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **404 Not Found**: Project not found
- **401 Unauthorized**: Missing or invalid token

---

## Availability Endpoints

### Get Personnel Availability

**Endpoint**: `GET /api/availability/:personnelId`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `personnelId` (required): Personnel ID

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **404 Not Found**: Personnel not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Create Availability Period

**Endpoint**: `POST /api/availability`

**Authentication**: Required (Bearer token)

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

**Required Fields**: `personnel_id`, `start_date`, `end_date`, `availability_percentage`

**Optional Fields**: `notes`

**Date Format**: `YYYY-MM-DD`

**Availability Percentage**: Integer between 0 and 100

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid date format, end_date must be after start_date, availability_percentage out of range
  ```json
  {
    "success": false,
    "error": {
      "message": "Missing required fields: personnel_id, start_date, end_date, and availability_percentage are required"
    }
  }
  ```
- **404 Not Found**: Personnel not found
- **409 Conflict**: Overlapping availability period exists
  ```json
  {
    "success": false,
    "error": {
      "message": "Availability period overlaps with existing period"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Availability Period

**Endpoint**: `PUT /api/availability/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Availability period ID

**Request Body** (all fields optional):
```json
{
  "start_date": "2024-02-01",
  "end_date": "2024-04-30",
  "availability_percentage": 75,
  "notes": "Updated availability"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Invalid date format, end_date must be after start_date, availability_percentage out of range
- **404 Not Found**: Availability period not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Availability period not found"
    }
  }
  ```
- **409 Conflict**: Overlapping availability period exists
- **401 Unauthorized**: Missing or invalid token

---

### Delete Availability Period

**Endpoint**: `DELETE /api/availability/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Availability period ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Availability period deleted successfully"
}
```

**Error Responses**:
- **404 Not Found**: Availability period not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Availability period not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

## Allocation Endpoints

### Get Allocations for Personnel

**Endpoint**: `GET /api/allocations/personnel/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Personnel ID

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **404 Not Found**: Personnel not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Get Allocations for Project

**Endpoint**: `GET /api/allocations/project/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Project ID

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **404 Not Found**: Project not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Project not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Create Project Allocation

**Endpoint**: `POST /api/allocations`

**Authentication**: Required (Bearer token)

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

**Required Fields**: `project_id`, `personnel_id`, `allocation_percentage`, `start_date`, `end_date`

**Optional Fields**: `role_in_project`

**Date Format**: `YYYY-MM-DD`

**Allocation Percentage**: Integer between 0 and 100 (default: 100)

**Success Response** (201 Created):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Missing required fields, invalid date format, end_date must be after start_date, allocation_percentage out of range
  ```json
  {
    "success": false,
    "error": {
      "message": "Missing required fields: project_id, personnel_id, start_date, end_date, and allocation_percentage are required"
    }
  }
  ```
- **404 Not Found**: Project or personnel not found
- **409 Conflict**: Personnel not available for requested period, allocation already exists, total allocations exceed 100%
  ```json
  {
    "success": false,
    "error": {
      "message": "Personnel is not available for the requested period. Average availability: 50%, Required: 100%"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

### Update Project Allocation

**Endpoint**: `PUT /api/allocations/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Allocation ID

**Request Body** (all fields optional):
```json
{
  "allocation_percentage": 75,
  "end_date": "2024-07-31",
  "role_in_project": "Senior Developer"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
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

**Error Responses**:
- **400 Bad Request**: Invalid date format, end_date must be after start_date, allocation_percentage out of range
- **404 Not Found**: Allocation not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Allocation not found"
    }
  }
  ```
- **409 Conflict**: Total allocations would exceed 100%
- **401 Unauthorized**: Missing or invalid token

---

### Delete Project Allocation

**Endpoint**: `DELETE /api/allocations/:id`

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (required): Allocation ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Allocation deleted successfully"
}
```

**Error Responses**:
- **404 Not Found**: Allocation not found
  ```json
  {
    "success": false,
    "error": {
      "message": "Allocation not found"
    }
  }
  ```
- **401 Unauthorized**: Missing or invalid token

---

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Endpoints that do NOT require authentication:**
- `POST /api/auth/register`
- `POST /api/auth/login`

**All other endpoints require authentication.**

---

## Common Error Responses

### 400 Bad Request
Validation error or invalid input:
```json
{
  "success": false,
  "error": {
    "message": "Validation error message",
    "details": ["Field 'email' is required"]
  }
}
```

### 401 Unauthorized
Missing or invalid authentication token:
```json
{
  "success": false,
  "error": {
    "message": "Access denied. No token provided."
  }
}
```

### 403 Forbidden
Insufficient permissions (if role-based access is implemented):
```json
{
  "success": false,
  "error": {
    "message": "Access denied. Admin role required."
  }
}
```

### 404 Not Found
Resource not found:
```json
{
  "success": false,
  "error": {
    "message": "Resource not found"
  }
}
```

### 409 Conflict
Resource already exists or conflict with existing data:
```json
{
  "success": false,
  "error": {
    "message": "Email already exists"
  }
}
```

### 500 Internal Server Error
Unexpected server error:
```json
{
  "success": false,
  "error": {
    "message": "Internal server error"
  }
}
```

---

## Data Types and Enums

### Experience Level
Values: `Junior`, `Mid-Level`, `Senior`

### Proficiency Level
Values: `Beginner`, `Intermediate`, `Advanced`, `Expert`

### Skill Category
Values: `Programming Language`, `Framework`, `Tool`, `Soft Skill`, `Other`

### Project Status
Values: `Planning`, `Active`, `Completed`, `On Hold`

### User Role
Values: `admin`, `manager`, `user`

### Date Formats
- Dates: `YYYY-MM-DD` (e.g., `2024-01-01`)
- Timestamps: `YYYY-MM-DDTHH:mm:ss.sssZ` (ISO 8601 format)

### Numeric Ranges
- Allocation percentage: 0-100 (integer)
- Availability percentage: 0-100 (integer)
- Years of experience: Decimal number (e.g., 3.5)

---

## Notes

- All dates must be in `YYYY-MM-DD` format
- Pagination defaults: `page=1`, `limit=10`
- All timestamps are returned in ISO 8601 format with timezone
- Percentages (allocation, availability) are integers between 0 and 100
- The system prevents over-allocation by checking total allocations don't exceed 100% for overlapping periods
- Availability conflicts are checked when creating allocations to ensure personnel have sufficient capacity

