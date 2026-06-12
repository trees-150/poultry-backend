const db = require('../config/db');

(async function(){
  try{
    console.log('Deleting orphan sales (farm_id IS NULL)...');
    const res = await db.query("DELETE FROM sales WHERE farm_id IS NULL RETURNING id,user_id,flock_id,quantity_sold");
    console.log('Deleted sales rows count =', res.rowCount);
    if(res.rowCount>0) console.log(res.rows);
    await db.pool.end();
    process.exit(0);
  }catch(err){
    console.error('Error deleting orphan sales:', err);
    process.exit(1);
  }
})();
