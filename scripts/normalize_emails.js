const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function findDuplicates() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT lower(trim(email)) AS normalized, array_agg(id) AS ids, count(*)
      FROM users
      GROUP BY normalized
      HAVING count(*) > 1
    `);
    return res.rows;
  } finally {
    client.release();
  }
}

async function main() {
  const dups = await findDuplicates();
  if (dups.length === 0) {
    console.log('No duplicate normalized emails found.');
    process.exit(0);
  }

  console.log('Duplicate normalized emails:');
  dups.forEach(r => console.log(r));
  console.log('Resolve duplicates manually (merge accounts or delete).');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
