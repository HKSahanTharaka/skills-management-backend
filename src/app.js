/**
 * Main Application File
 * 
 * This file sets up the Express application with all middleware and routes.
 * 
 * Middleware order matters:
 * 1. CORS (allows frontend to make requests)
 * 2. Body parsers (JSON, URL encoded)
 * 3. Your routes
 * 4. Error handler (catches all errors)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth.routes');
const personnelRoutes = require('./routes/personnel.routes');
const skillRoutes = require('./routes/skill.routes');
const projectRoutes = require('./routes/project.routes');
const matchingRoutes = require('./routes/matching.routes');
const availabilityRoutes = require('./routes/availability.routes');
const allocationRoutes = require('./routes/allocation.routes');

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express application
const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

/**
 * 1. CORS Middleware
 * Allows frontend to make requests from different origins
 * Must be placed FIRST to allow cross-origin requests
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow requests from frontend URL or all origins in development
  credentials: true, // Allow cookies/credentials to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. Body Parsers
 * Parse incoming request bodies in JSON and URL-encoded formats
 * Must be placed BEFORE routes so request bodies are available
 */

// JSON body parser - parses JSON request bodies
app.use(express.json({
  limit: '10mb' // Limit JSON payload size
}));

// URL-encoded body parser - parses form data
app.use(express.urlencoded({
  extended: true, // Use qs library for parsing (supports nested objects)
  limit: '10mb' // Limit URL-encoded payload size
}));

// ============================================
// ROUTE MOUNTING
// ============================================

/**
 * 3. Routes
 * Mount all route handlers
 * All routes are prefixed with /api
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/allocations', allocationRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

/**
 * 4. Error Handler
 * Must be placed AFTER all routes to catch errors
 * Order: 404 handler first, then general error handler
 */

// 404 handler - catches requests to non-existent routes
app.use(notFoundHandler);

// Global error handler - catches all errors from route handlers
app.use(errorHandler);

// Export the configured Express app
module.exports = app;

