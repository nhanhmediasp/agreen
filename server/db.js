import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const dbUser = (process.env.DB_USER && process.env.DB_USER.trim()) || 'agrenn_sql';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'agrenn_sql';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

const poolConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
};

console.log(`[DB Pool] Connecting to PostgreSQL at ${dbHost}:${dbPort} as user "${dbUser}" (db: "${dbName}")`);

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
