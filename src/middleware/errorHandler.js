/**
 * Error Handling Middleware
 *
 * Centralized error handling for the application.
 *
 * Features:
 * - Catches all errors from routes
 * - Formats error response consistently
 * - Logs errors for debugging
 * - Returns appropriate status codes
 *
 * Error types handled:
 * - Validation errors (400)
 * - Not found errors (404)
 * - Unauthorized errors (401)
 * - Database errors (500)
 * - Duplicate entry errors (409)
 *
 * Error Handler: Must be placed AFTER all routes to catch errors
 */

/**
 * Global error handler middleware
 * Handles all errors thrown in route handlers
 *
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res) => {
  // Log error details for debugging
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
    errorCode: err.code,
    errorName: err.name,
  };

  // eslint-disable-next-line no-console
  console.error('Error occurred:', {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
  });

  // Log full error details in development
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error('Error details:', errorLog);
  }

  // Default error status and message
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorDetails = null;

  // ============================================
  // VALIDATION ERRORS (400)
  // ============================================
  if (err.name === 'ValidationError' || err.name === 'ValidatorError') {
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.errors || err.details || [err.message];
  }
  // Handle express-validator errors
  else if (err.array && typeof err.array === 'function') {
    // This is an express-validator ValidationChain result
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.array();
  }

  // ============================================
  // UNAUTHORIZED ERRORS (401)
  // ============================================
  else if (
    err.name === 'UnauthorizedError' ||
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    statusCode = 401;
    message = 'Unauthorized: Invalid or missing authentication token';
  }

  // ============================================
  // FORBIDDEN ERRORS (403)
  // ============================================
  else if (err.name === 'ForbiddenError' || statusCode === 403) {
    statusCode = 403;
    message =
      err.message ||
      'Forbidden: You do not have permission to access this resource';
  }

  // ============================================
  // NOT FOUND ERRORS (404)
  // ============================================
  else if (err.name === 'NotFoundError' || statusCode === 404) {
    statusCode = 404;
    message = err.message || 'Resource not found';
  }
  // Handle MySQL foreign key constraint errors (referenced row not found)
  else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 404;
    message = 'Referenced record not found';
  }
  // Handle MySQL errors for non-existent records
  else if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 404;
    message = 'Database table not found';
  }

  // ============================================
  // DUPLICATE ENTRY ERRORS (409)
  // ============================================
  else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry: This record already exists';

    // Extract field name from MySQL error message if available
    const match = err.sqlMessage?.match(/for key '(.+?)'/);
    if (match) {
      errorDetails = {
        field: match[1],
        message: 'This value already exists in the database',
      };
    }
  }
  // Handle unique constraint violations
  else if (err.code === 'ER_DUP_KEY') {
    statusCode = 409;
    message = 'Duplicate key: This record violates a unique constraint';
  }

  // ============================================
  // DATABASE ERRORS (500)
  // ============================================
  else if (err.code && err.code.startsWith('ER_')) {
    // MySQL/MariaDB error codes
    statusCode = 500;
    message = 'Database error occurred';

    // Map specific database errors to user-friendly messages
    switch (err.code) {
      case 'ER_ACCESS_DENIED_ERROR':
        message = 'Database access denied. Check database credentials.';
        break;
      case 'ER_BAD_DB_ERROR':
        message = 'Database does not exist';
        break;
      case 'ER_CON_COUNT_ERROR':
        message = 'Too many database connections';
        break;
      case 'PROTOCOL_CONNECTION_LOST':
        message = 'Database connection was lost';
        break;
      case 'ECONNREFUSED':
        message =
          'Database connection refused. Check if database server is running.';
        break;
      case 'ETIMEDOUT':
        message = 'Database connection timeout';
        break;
      default:
        // Log the actual error code for debugging
        if (process.env.NODE_ENV === 'development') {
          errorDetails = {
            code: err.code,
            sqlMessage: err.sqlMessage,
          };
        }
    }
  }
  // Handle connection pool errors
  else if (
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT'
  ) {
    statusCode = 500;
    message = 'Database connection error';
  }

  // ============================================
  // SYNTAX ERRORS (400)
  // ============================================
  else if (err.name === 'SyntaxError' || err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid request format or data type';
  }

  // ============================================
  // RATE LIMITING ERRORS (429)
  // ============================================
  else if (err.name === 'TooManyRequestsError' || statusCode === 429) {
    statusCode = 429;
    message = err.message || 'Too many requests. Please try again later.';
  }

  // ============================================
  // INTERNAL SERVER ERRORS (500)
  // ============================================
  // If status code is still 500, it's an unhandled error
  if (statusCode === 500) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV !== 'development') {
      message = 'Internal server error. Please try again later.';
      errorDetails = null;
    } else {
      // In development, include more details
      errorDetails = {
        name: err.name,
        code: err.code,
        message: err.message,
      };
    }
  }

  // ============================================
  // FORMAT ERROR RESPONSE
  // ============================================
  const errorResponse = {
    success: false,
    error: {
      message: message,
    },
  };

  // Add error details if available
  if (errorDetails) {
    errorResponse.error.details = errorDetails;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Add timestamp
  errorResponse.error.timestamp = timestamp;

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Catches requests to routes that don't exist
 *
 * This middleware should be placed after all routes but before the error handler
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res) => {
  const timestamp = new Date().toISOString();

  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp,
    },
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 *
 * Usage:
 * router.get('/route', asyncHandler(async (req, res, next) => {
 *   // async code here
 * }));
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for application-specific errors
 *
 * Usage:
 * throw new AppError('Resource not found', 404);
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
};
