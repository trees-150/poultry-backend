const db = require('../config/db');

(async function(){
  try{
    console.log('Cleaning up temporary smoke-test user and farm...');

    const userEmail = 'smoke_user@example.com';
    const farmInvite = 'smoke_invite_code';

    const userDel = await db.query('DELETE FROM users WHERE email = $1 RETURNING id, email, farm_id', [userEmail]);
    console.log('Deleted users count =', userDel.rowCount);
    if(userDel.rowCount>0) console.table(userDel.rows);

    // Null out farm created_by references just in case
    const farmFetch = await db.query('SELECT id FROM farms WHERE invite_code = $1', [farmInvite]);
    if(farmFetch.rowCount>0){
      const farmId = farmFetch.rows[0].id;
      try{
        await db.query('UPDATE users SET farm_id = NULL WHERE farm_id = $1', [farmId]);
      }catch(e){ /* ignore */ }
    }

    const farmDel = await db.query('DELETE FROM farms WHERE invite_code = $1 RETURNING id, name, invite_code', [farmInvite]);
    console.log('Deleted farms count =', farmDel.rowCount);
    if(farmDel.rowCount>0) console.table(farmDel.rows);

    await db.pool.end();
    process.exit(0);
  }catch(err){
    console.error('Cleanup error:', err);
    try{ await db.pool.end(); }catch(e){}
    process.exit(1);
  }
})();
