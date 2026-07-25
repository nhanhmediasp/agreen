import pkg from 'pg';
const { Pool } = pkg;

// Optimized PostgreSQL Connection Pool configuration
// Adjust environment variables in .env file when deploying to VPanel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'vpanel_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'car_rental_db',
  
  // Connection Pool Tuning for VPS
  max: 20,                   // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error if connection takes > 2s
  maxUses: 7500,             // Close a connection after 7500 queries to prevent memory leaks
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Execute a single query with automatic client checkout/checkin
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Get a pool client for manual transactions (BEGIN, COMMIT, ROLLBACK)
 */
export const getClient = () => pool.connect();

export default pool;
