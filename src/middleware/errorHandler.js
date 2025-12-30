const errorHandler = (err, req, res) => {
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

  console.error('Error occurred:', {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
  });

  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', errorLog);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorDetails = null;

  if (err.name === 'ValidationError' || err.name === 'ValidatorError') {
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.errors || err.details || [err.message];
  }
  else if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.array();
  }

  else if (
    err.name === 'UnauthorizedError' ||
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    statusCode = 401;
    message = 'Unauthorized: Invalid or missing authentication token';
  }

  else if (err.name === 'ForbiddenError' || statusCode === 403) {
    statusCode = 403;
    message =
      err.message ||
      'Forbidden: You do not have permission to access this resource';
  }

  else if (err.name === 'NotFoundError' || statusCode === 404) {
    statusCode = 404;
    message = err.message || 'Resource not found';
  }
  else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 404;
    message = 'Referenced record not found';
  }
  else if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 404;
    message = 'Database table not found';
  }

  else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry: This record already exists';

    const match = err.sqlMessage?.match(/for key '(.+?)'/);
    if (match) {
      errorDetails = {
        field: match[1],
        message: 'This value already exists in the database',
      };
    }
  }
  else if (err.code === 'ER_DUP_KEY') {
    statusCode = 409;
    message = 'Duplicate key: This record violates a unique constraint';
  }

  else if (err.code && err.code.startsWith('ER_')) {
    statusCode = 500;
    message = 'Database error occurred';

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
        if (process.env.NODE_ENV === 'development') {
          errorDetails = {
            code: err.code,
            sqlMessage: err.sqlMessage,
          };
        }
    }
  }
  else if (
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT'
  ) {
    statusCode = 500;
    message = 'Database connection error';
  }

  else if (err.name === 'SyntaxError' || err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid request format or data type';
  }

  else if (err.name === 'TooManyRequestsError' || statusCode === 429) {
    statusCode = 429;
    message = err.message || 'Too many requests. Please try again later.';
  }

  if (statusCode === 500) {
    if (process.env.NODE_ENV !== 'development') {
      message = 'Internal server error. Please try again later.';
      errorDetails = null;
    } else {
      errorDetails = {
        name: err.name,
        code: err.code,
        message: err.message,
      };
    }
  }

  const errorResponse = {
    success: false,
    error: {
      message: message,
    },
  };

  if (errorDetails) {
    errorResponse.error.details = errorDetails;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  errorResponse.error.timestamp = timestamp;

  res.status(statusCode).json(errorResponse);
};

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

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

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
