const db = require('../config/db');
const { getDashboardSummary } = require('../controllers/dashboardController');

(async function(){
  try{
    // find a user with a farm_id
    const ures = await db.query('SELECT id FROM users WHERE farm_id IS NOT NULL LIMIT 1');
    let user;
    if (ures.rowCount > 0) user = ures.rows[0];
    else {
      // create temporary farm and user for smoke test
      console.log('No users with farm found — creating temporary farm and user for smoke test');
      const farmRes = await db.query("INSERT INTO farms (name, invite_code, created_by) VALUES ($1,$2,$3) RETURNING id", ['smoke_test_farm', 'smoke_invite_code', null]);
      const farmId = farmRes.rows[0].id;
      const userRes2 = await db.query("INSERT INTO users (name,email,password,created_at) VALUES ($1,$2,$3,NOW()) RETURNING id", ['smoke_test_user','smoke_user@example.com','password']);
      const userId = userRes2.rows[0].id;
      await db.query('UPDATE users SET farm_id = $1 WHERE id = $2', [farmId, userId]);
      user = { id: userId };
      // mark for cleanup
      reqCleanup = { farmId, userId };
    }

    const req = { user: { id: user.id } };
    const res = {
      status(code){ this._status = code; return this; },
      json(obj){ console.log(JSON.stringify(obj, null, 2)); return; }
    };

    await getDashboardSummary(req, res);
    await db.pool.end();
    // optionally cleanup left in script (not deleting to preserve test data)
  }catch(err){
    console.error('Smoke test failed:', err);
    try{ await db.pool.end(); }catch(e){}
    process.exit(1);
  }
})();
