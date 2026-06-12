const db = require('../config/db');

async function run() {
  try {
    console.log('Altering sales table to add farm_id column...');

    await db.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS farm_id INTEGER`);

    await db.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farms') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'sales' AND kcu.column_name = 'farm_id'
        ) THEN
          ALTER TABLE sales ADD CONSTRAINT sales_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id);
        END IF;
      END IF;
    END $$;`);

    // Attempt safe backfill from users table where possible
    console.log('Attempting to backfill sales.farm_id from users.farm_id where user_id is present...');
    const backfillRes = await db.query(`UPDATE sales SET farm_id = users.farm_id FROM users WHERE sales.user_id = users.id AND sales.farm_id IS NULL RETURNING sales.id`);
    console.log(`Backfilled ${backfillRes.rowCount} sales rows.`);

    const nulls = await db.query("SELECT COUNT(*) AS cnt FROM sales WHERE farm_id IS NULL");
    const cnt = parseInt(nulls.rows[0].cnt, 10);
    if (cnt === 0) {
      try {
        await db.query('ALTER TABLE sales ALTER COLUMN farm_id SET NOT NULL');
        console.log('Set farm_id column to NOT NULL');
      } catch (e) {
        console.warn('Could not set NOT NULL on farm_id:', e.message);
      }
    } else {
      console.log(`Found ${cnt} rows with NULL farm_id. Please backfill farm_id values before setting NOT NULL.`);
    }

    console.log('Done. Application enforces farm ownership; consider backfilling farm_id values if present.');
    process.exit(0);
  } catch (err) {
    console.error('Error altering sales table:', err);
    process.exit(1);
  }
}

run();
