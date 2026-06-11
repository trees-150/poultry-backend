const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let poolConfig;

if (process.env.DATABASE_URL) {
  const connStr = process.env.DATABASE_URL;
  const connLower = connStr.toLowerCase();
  const needsSsl = connLower.includes('sslmode=require') || connLower.includes('ssl=true') || process.env.DB_SSL === 'true' || isProduction;

  poolConfig = {
    connectionString: connStr,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  };

} else {
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

const pool = new Pool(poolConfig);

// Diagnostic logging (safe: does not print passwords)
try {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`DB use DATABASE_URL -> host=${url.hostname} port=${url.port || 'default'} ssl=${!!poolConfig.ssl}`);
  } else {
    console.log(`DB use individual env vars -> host=${process.env.DB_HOST || 'undefined'} port=${process.env.DB_PORT || 'undefined'} ssl=${!!poolConfig.ssl}`);
  }
} catch (e) {
  console.log('DB config logging error:', e.message);
}

pool.on('connect', () => console.log('Connected to the PostgreSQL database'));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
