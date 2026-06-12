const db = require('../config/db');

(async function(){
  try{
    console.log('Deleting orphan vaccinations (farm_id IS NULL)...');
    const res = await db.query("DELETE FROM vaccination WHERE farm_id IS NULL RETURNING id,user_id,flock_id,vaccine_name");
    console.log('Deleted vaccination rows count =', res.rowCount);
    if(res.rowCount>0) console.log(res.rows);
    await db.pool.end();
    process.exit(0);
  }catch(err){
    console.error('Error deleting orphan vaccinations:', err);
    process.exit(1);
  }
})();
