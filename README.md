# Skills Management Backend

Backend API for managing personnel skills, project assignments, and resource allocation. Handles everything from authentication to matching the right people with the right projects based on their skills and availability.

## Tech Stack

- Node.js with Express
- MySQL (using mysql2)
- JWT authentication
- Cloudinary for file uploads
- bcryptjs for password hashing

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

## Running the Application

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Set up your `.env` file with the required environment variables:
```
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=skills_management
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Initialize the database:
```bash
mysql -u your_user -p < database/schema.sql
mysql -u your_user -p < database/seed.sql
```

4. Start the server:
```bash
npm start          # production
npm run dev        # development with nodemon
```

The API will run on `http://localhost:5000` (or whatever port you set in your env).

## Testing

```bash
npm test              # run all tests with coverage
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
```

### Gaining Full Admin Access

To gain full access to the system, you must become an admin. After registering as a manager, run these SQL scripts on your MySQL database:

```sql
-- Approve the manager user
UPDATE users SET approval_status = 'approved' WHERE email = 'user@example.com' AND role = 'manager';

-- Promote a manager user to admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

Replace `'user@example.com'` with your actual email address.

## Additional Feature

### Availability & Allocation Management

A comprehensive resource management system that addresses one of the most critical challenges in consultancy firms: **preventing personnel burnout and optimizing team capacity planning**.

#### The Problem It Solves

In real-world consultancy environments, managers face several challenges:

1. **Over-allocation Risk**: Personnel often get assigned to multiple projects simultaneously without clear visibility of their total workload, leading to burnout and reduced quality of work.

2. **Resource Planning**: When planning new projects, managers struggle to identify who has capacity and when they'll become available.

3. **Utilization Blindness**: Without clear metrics, it's difficult to identify underutilized team members or departments, leading to inefficient resource distribution.

4. **Timeline Conflicts**: Overlapping project assignments are often discovered too late, causing delays and conflicts.

#### How It Works

The feature provides three integrated views:

**1. Availability Calendar**
- Visual calendar interface showing each personnel's availability status (available, partially allocated, fully allocated, unavailable)
- Color-coded time periods that instantly communicate capacity
- Ability to set custom availability periods (vacation, training, sick leave, etc.)
- Drag-and-drop interface for quick updates

**2. Project Allocation Timeline**
- Gantt-chart style visualization showing all team members allocated to a specific project
- 4-month rolling window with navigation controls
- Shows allocation percentages and duration for each assignment
- Visual indicators for over-allocation (>100% capacity)

**3. Team Utilization Dashboard**
- Real-time metrics showing:
  - Total personnel count
  - Optimally utilized team members (80-100%)
  - Over-allocated personnel (>100%)
  - Available capacity for new projects
- Individual utilization cards with status badges
- Breakdown of allocations per person with project details
- Warning indicators for burnout risk

#### Why This Feature Matters

Unlike simple cosmetic additions, this feature:

- **Prevents Business Risks**: Identifies over-allocation before it causes burnout or project failures
- **Enables Proactive Planning**: Managers can plan project staffing weeks or months in advance
- **Improves Decision Making**: Data-driven insights replace guesswork in resource allocation
- **Scales With Growth**: As the consultancy grows, the system maintains visibility across larger teams
- **Integrates Seamlessly**: Works with existing personnel and project data without requiring process changes

#### Technical Implementation

The feature demonstrates advanced development skills:

- **Complex State Management**: Coordinating calendar events, allocations, and real-time updates
- **Data Visualization**: Custom chart components using date-fns for timeline calculations
- **Performance Optimization**: Efficient filtering and memoization for large datasets
- **Responsive Design**: Touch-friendly calendar interface that works on all devices
- **Real-time Calculations**: Dynamic utilization percentages based on allocation data

#### User Impact

For managers, this feature transforms resource planning from a reactive, problem-solving activity into a proactive, strategic function. They can:

- Instantly see who's available for urgent projects
- Plan capacity 3-6 months ahead
- Identify and address over-allocation before it becomes a problem
- Make data-informed decisions about hiring needs
- Balance workload fairly across the team

This is the kind of feature that would be essential for any consultancy operating at scale, solving real operational challenges that directly impact both employee wellbeing and business success.
