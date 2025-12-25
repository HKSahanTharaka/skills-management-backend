/**
 * Database Configuration Module
 *
 * This module handles MySQL database connection using connection pooling.
 * Connection pools maintain several open connections instead of opening/closing
 * a connection for each request, which improves performance and efficiency.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * MySQL Connection Pool Configuration
 *
 * Connection Pool: Instead of opening/closing database connection for each request,
 * pool maintains several open connections that can be reused, improving performance.
 *
 * Environment Variables: Using process.env.DB_HOST reads from .env file
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skills_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Maximum number of connection requests the pool will queue (0 = unlimited)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection timeout settings
  acquireTimeout: 60000, // Time to wait for a connection from the pool (60 seconds)
  timeout: 60000, // Query timeout (60 seconds)
  // Reconnection settings
  reconnect: true,
  // SSL configuration (if needed for production)
  ssl: process.env.DB_SSL === 'true' ? {} : false,
});

/**
 * Error Handling: Event listeners for pool errors
 * These handlers catch database failures gracefully
 */
pool.on('connection', (connection) => {
  // eslint-disable-next-line no-console
  console.log(
    'New database connection established as id ' + connection.threadId
  );
});

pool.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Database pool error:', error.message);
  // eslint-disable-next-line no-console
  console.error('Error code:', error.code);
  // eslint-disable-next-line no-console
  console.error('Error details:', error);

  // Handle specific error types
  if (error.code === 'PROTOCOL_CONNECTION_LOST') {
    // eslint-disable-next-line no-console
    console.error('Database connection was closed. Attempting to reconnect...');
  } else if (error.code === 'ER_CON_COUNT_ERROR') {
    // eslint-disable-next-line no-console
    console.error('Database has too many connections.');
  } else if (error.code === 'ECONNREFUSED') {
    // eslint-disable-next-line no-console
    console.error(
      'Database connection was refused. Check if MySQL server is running.'
    );
  }
});

/**
 * Test Database Connection Function
 *
 * This function tests the database connection by acquiring a connection
 * from the pool and executing a simple query.
 *
 * Error Handling: Try-catch blocks to handle connection failures gracefully
 *
 * @returns {Promise<boolean>} Returns true if connection is successful, false otherwise
 */
async function testConnection() {
  let connection = null;

  try {
    // Attempt to get a connection from the pool
    connection = await pool.getConnection();

    // Test the connection with a simple query
    await connection.ping();

    // eslint-disable-next-line no-console
    console.log('Database connection established successfully');
    // eslint-disable-next-line no-console
    console.log(`Connection ID: ${connection.threadId}`);
    // eslint-disable-next-line no-console
    console.log(`Database: ${process.env.DB_NAME || 'skills_management'}`);

    return true;
  } catch (error) {
    // Error Handling: Comprehensive error logging
    // eslint-disable-next-line no-console
    console.error('Database connection failed!');
    // eslint-disable-next-line no-console
    console.error('Error message:', error.message);
    // eslint-disable-next-line no-console
    console.error('Error code:', error.code);

    // Provide helpful error messages based on error type
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      // eslint-disable-next-line no-console
      console.error(
        'Tip: Check your database username and password in .env file'
      );
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      // eslint-disable-next-line no-console
      console.error(
        'Tip: Database does not exist. Run the schema.sql file to create it.'
      );
    } else if (error.code === 'ECONNREFUSED') {
      // eslint-disable-next-line no-console
      console.error('Tip: Make sure MySQL server is running and accessible');
    } else if (error.code === 'ETIMEDOUT') {
      // eslint-disable-next-line no-console
      console.error(
        'Tip: Connection timeout. Check your DB_HOST and network connectivity'
      );
    } else {
      // eslint-disable-next-line no-console
      console.error('Tip: Verify your database configuration in .env file');
      // eslint-disable-next-line no-console
      console.error(
        '   Required variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME'
      );
    }

    return false;
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Gracefully close all connections in the pool
 * This should be called when shutting down the application
 *
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    await pool.end();
    // eslint-disable-next-line no-console
    console.log('Database connection pool closed successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error closing database pool:', error.message);
    throw error;
  }
}

// Initialize database connection on module load
// This tests the connection when the module is first imported
testConnection().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize database connection:', error.message);
});

// Export the pool and functions for use in other modules
module.exports = {
  pool,
  testConnection,
  closePool,
};
