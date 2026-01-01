const { errorHandler, notFoundHandler, AppError } = require('../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Set to development mode for better error details
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Something went wrong',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should use custom status code if provided', () => {
      const error = new Error('Not found');
      error.statusCode = 404;

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = ['Email is required', 'Password is too short'];

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation Error',
            details: error.errors,
          }),
        })
      );
    });

    it('should handle JWT errors with 401 status', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Unauthorized'),
          }),
        })
      );
    });

    it('should handle TokenExpiredError with 401 status', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle database duplicate entry error', () => {
      const error = new Error('Duplicate entry');
      error.code = 'ER_DUP_ENTRY';
      error.sqlMessage = "Duplicate entry 'test@example.com' for key 'email'";

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Duplicate entry'),
          }),
        })
      );
    });

    it('should handle database referenced row error', () => {
      const error = new Error('Referenced row not found');
      error.code = 'ER_NO_REFERENCED_ROW_2';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Referenced record not found',
          }),
        })
      );
    });

    it('should handle database connection errors', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Database connection error'),
          }),
        })
      );
    });

    it('should handle ForbiddenError with 403 status', () => {
      const error = new Error('Access denied');
      error.name = 'ForbiddenError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle TooManyRequestsError with 429 status', () => {
      const error = new Error('Too many requests');
      error.name = 'TooManyRequestsError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should sanitize error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error with sensitive data');

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Internal server error. Please try again later.',
          }),
        })
      );
      // Should not include stack trace in production
      expect(res.json.mock.calls[0][0].error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include timestamp in error response', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should handle SyntaxError with 400 status', () => {
      const error = new SyntaxError('Unexpected token');

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid request format'),
          }),
        })
      );
    });

    it('should handle CastError with 400 status', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for not found routes', () => {
      req.method = 'GET';
      req.originalUrl = '/api/nonexistent';

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Route GET /api/nonexistent not found',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should include request method and URL in error message', () => {
      req.method = 'POST';
      req.originalUrl = '/api/missing/endpoint';

      notFoundHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('POST /api/missing/endpoint'),
          }),
        })
      );
    });
  });

  describe('AppError class', () => {
    it('should create error with custom status code', () => {
      const error = new AppError('Custom error', 422);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('AppError');
    });

    it('should default to 500 status code', () => {
      const error = new AppError('Server error');

      expect(error.statusCode).toBe(500);
    });

    it('should include details if provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = new AppError('Validation error', 400, details);

      expect(error.details).toEqual(details);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle ER_ACCESS_DENIED_ERROR', () => {
      const error = new Error('Access denied');
      error.code = 'ER_ACCESS_DENIED_ERROR';

      errorHandler(error, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('Database access denied'),
          }),
        })
      );
    });

    it('should handle ER_BAD_DB_ERROR', () => {
      const error = new Error('Bad database');
      error.code = 'ER_BAD_DB_ERROR';

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database does not exist',
          }),
        })
      );
    });

    it('should handle ER_CON_COUNT_ERROR', () => {
      const error = new Error('Too many connections');
      error.code = 'ER_CON_COUNT_ERROR';

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Too many database connections',
          }),
        })
      );
    });

    it('should handle PROTOCOL_CONNECTION_LOST', () => {
      const error = new Error('Connection lost');
      error.code = 'PROTOCOL_CONNECTION_LOST';

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('Database connection'),
          }),
        })
      );
    });

    it('should handle ETIMEDOUT', () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';

      errorHandler(error, req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('connection'),
          }),
        })
      );
    });
  });
});

