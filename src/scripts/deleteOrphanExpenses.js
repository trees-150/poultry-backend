const db = require('../config/db');

(async function(){
  try{
    console.log('Deleting orphan expenses (farm_id IS NULL)...');
    const res = await db.query("DELETE FROM expenses WHERE farm_id IS NULL RETURNING id,user_id,category,amount");
    console.log('Deleted expenses rows count =', res.rowCount);
    if(res.rowCount>0) console.log(res.rows);
    await db.pool.end();
    process.exit(0);
  }catch(err){
    console.error('Error deleting orphan expenses:', err);
    process.exit(1);
  }
})();
