require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skills_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  ssl: process.env.DB_SSL === 'true' ? {} : false,
});

pool.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Database pool error:', error.message);
  // eslint-disable-next-line no-console
  console.error('Error code:', error.code);
  // eslint-disable-next-line no-console
  console.error('Error details:', error);

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

async function testConnection() {
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.ping();

    // eslint-disable-next-line no-console
    console.log('Database connection established successfully');
    // eslint-disable-next-line no-console
    console.log(`Connection ID: ${connection.threadId}`);
    // eslint-disable-next-line no-console
    console.log(`Database: ${process.env.DB_NAME || 'skills_management'}`);

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Database connection failed!');
    // eslint-disable-next-line no-console
    console.error('Error message:', error.message);
    // eslint-disable-next-line no-console
    console.error('Error code:', error.code);

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
    if (connection) {
      connection.release();
    }
  }
}

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

testConnection().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize database connection:', error.message);
});

module.exports = {
  pool,
  testConnection,
  closePool,
};
