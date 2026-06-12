const db = require('../config/db');

async function run() {
  try {
    console.log('Altering treatment table to add farm_id column...');

    await db.query(`ALTER TABLE treatment ADD COLUMN IF NOT EXISTS farm_id INTEGER`);

    await db.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farms') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'treatment' AND kcu.column_name = 'farm_id'
        ) THEN
          ALTER TABLE treatment ADD CONSTRAINT treatment_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id);
        END IF;
      END IF;
    END $$;`);

    console.log('Attempting to backfill treatment.farm_id from users.farm_id where user_id is present...');
    const backfillRes = await db.query(`UPDATE treatment SET farm_id = users.farm_id FROM users WHERE treatment.user_id = users.id AND treatment.farm_id IS NULL RETURNING treatment.id`);
    console.log(`Backfilled ${backfillRes.rowCount} treatment rows.`);

    const nulls = await db.query("SELECT COUNT(*) AS cnt FROM treatment WHERE farm_id IS NULL");
    const cnt = parseInt(nulls.rows[0].cnt, 10);
    if (cnt === 0) {
      try {
        await db.query('ALTER TABLE treatment ALTER COLUMN farm_id SET NOT NULL');
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
    console.error('Error altering treatment table:', err);
    process.exit(1);
  }
}

run();
