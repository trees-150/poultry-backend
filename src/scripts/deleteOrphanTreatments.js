const db = require('../config/db');

(async function(){
  try{
    console.log('Deleting orphan treatments (farm_id IS NULL)...');
    const res = await db.query("DELETE FROM treatment WHERE farm_id IS NULL RETURNING id,user_id,flock_id,disease");
    console.log('Deleted treatment rows count =', res.rowCount);
    if(res.rowCount>0) console.log(res.rows);
    await db.pool.end();
    process.exit(0);
  }catch(err){
    console.error('Error deleting orphan treatments:', err);
    process.exit(1);
  }
})();
