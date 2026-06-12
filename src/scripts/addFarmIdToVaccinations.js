const db = require('../config/db');

async function run() {
  try {
    console.log('Altering vaccination table to add farm_id column...');

    await db.query(`ALTER TABLE vaccination ADD COLUMN IF NOT EXISTS farm_id INTEGER`);

    await db.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farms') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'vaccination' AND kcu.column_name = 'farm_id'
        ) THEN
          ALTER TABLE vaccination ADD CONSTRAINT vaccination_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id);
        END IF;
      END IF;
    END $$;`);

    console.log('Attempting to backfill vaccination.farm_id from users.farm_id where user_id is present...');
    const backfillRes = await db.query(`UPDATE vaccination SET farm_id = users.farm_id FROM users WHERE vaccination.user_id = users.id AND vaccination.farm_id IS NULL RETURNING vaccination.id`);
    console.log(`Backfilled ${backfillRes.rowCount} vaccination rows.`);

    const nulls = await db.query("SELECT COUNT(*) AS cnt FROM vaccination WHERE farm_id IS NULL");
    const cnt = parseInt(nulls.rows[0].cnt, 10);
    if (cnt === 0) {
      try {
        await db.query('ALTER TABLE vaccination ALTER COLUMN farm_id SET NOT NULL');
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
    console.error('Error altering vaccination table:', err);
    process.exit(1);
  }
}

run();
