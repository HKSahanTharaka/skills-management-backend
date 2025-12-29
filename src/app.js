require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const personnelRoutes = require('./routes/personnel.routes');
const skillRoutes = require('./routes/skill.routes');
const projectRoutes = require('./routes/project.routes');
const matchingRoutes = require('./routes/matching.routes');
const availabilityRoutes = require('./routes/availability.routes');
const allocationRoutes = require('./routes/allocation.routes');
const managerRoutes = require('./routes/manager.routes');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*', // Allow requests from frontend URL or all origins in development
    credentials: true, // Allow cookies/credentials to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(
  express.json({
    limit: '10mb', // Limit JSON payload size
  })
);

app.use(
  express.urlencoded({
    extended: true, // Use qs library for parsing (supports nested objects)
    limit: '10mb', // Limit URL-encoded payload size
  })
);
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/managers', managerRoutes);

// 404 handler - catches requests to non-existent routes
app.use(notFoundHandler);

// Global error handler - catches all errors from route handlers
app.use(errorHandler);

module.exports = app;
