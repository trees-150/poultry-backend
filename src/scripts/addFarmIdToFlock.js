const db = require('../config/db');

async function run() {
  try {
    console.log('Altering flock table to add farm_id column...');

    await db.query(`ALTER TABLE flock ADD COLUMN IF NOT EXISTS farm_id INTEGER`);
    await db.query(`-- optional: add foreign key if users/farms exist
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'flock'
        ) THEN
          -- add constraint only if farms table exists
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farms') THEN
            ALTER TABLE flock ADD CONSTRAINT flock_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id);
          END IF;
        END IF;
      END $$;`);

    console.log('Done. Note: application enforces farm ownership; consider backfilling farm_id values.');
    process.exit(0);
  } catch (err) {
    console.error('Error altering flock table:', err);
    process.exit(1);
  }
}

run();
