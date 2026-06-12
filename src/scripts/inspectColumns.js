const db = require('../config/db');

(async function(){
  try{
    const tables = ['flock','feed_inventory','feed_log','sales','expenses','mortality','vaccination','treatment'];
    for(const t of tables){
      const res = await db.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name = $1", [t]);
      console.log('\nTable:', t);
      console.table(res.rows);
    }
    await db.pool.end();
  }catch(err){
    console.error('Inspect error', err);
    process.exit(1);
  }
})();
