import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// Connection config: prefer DATABASE_URL if set, else explicit DB params
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'vpanel_car_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vpanel_car_rental',
    };

// Optimized PostgreSQL Connection Pool configuration
const pool = new Pool({
  ...poolConfig,
  max: 20,                   // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error if connection takes > 2s
  maxUses: 7500,             // Close a connection after 7500 queries to prevent memory leaks
});

pool.on('error', (err, _client) => {
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
