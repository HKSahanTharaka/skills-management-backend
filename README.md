# Skills Management Backend

Backend API for managing personnel skills, project assignments, and resource allocation. Handles everything from authentication to matching the right people with the right projects based on their skills and availability.

## Tech Stack

- Node.js with Express
- MySQL (using mysql2)
- JWT authentication
- Cloudinary for file uploads
- bcryptjs for password hashing

## Prerequisites

- Node.js 18 or higher
- MySQL 5.7+ or MySQL 8.0+
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
