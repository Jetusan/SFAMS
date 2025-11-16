const { Pool } = require('pg');
require('dotenv').config();

console.log('🟡 Initializing database connection...');

// Validate environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('🔶 Please check your .env file');
  process.exit(1);
}

console.log('✅ All required environment variables are present');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Test query to verify database is responsive
    const result = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });
    process.exit(1);
  }
};

// Event listeners for connection pool
pool.on('connect', () => {
  console.log('🔗 New database connection established');
});

pool.on('error', (err) => {
  console.error('🚨 Database pool error:', err.message);
});

pool.on('remove', () => {
  console.log('🔗 Database connection removed');
});

// Test connection immediately
testConnection();

module.exports = pool;