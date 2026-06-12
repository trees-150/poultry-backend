const db = require("../config/db");

// GET sales
const getSales = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const result = await db.query(`
      SELECT s.*, f.name AS flock_name
      FROM sales s
      JOIN flock f ON s.flock_id = f.id
      WHERE s.user_id = $1
      ORDER BY s.id DESC
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sales:", err);
    res.status(500).json({
      message: "Server error fetching sales",
      error: err.message
    });
  }
};

// CREATE sale
const createSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const user_id = req.user && req.user.id;
    const {
      flock_id,
      quantity_sold,
      price_per_unit,
      buyer_name,
      date_sold,
      notes
    } = req.body;

    const qty = Number(quantity_sold);
    const total_amount = qty * Number(price_per_unit || 0);

    await client.query('BEGIN');

    // INSERT sale (attach user_id)
    const result = await client.query(
      `INSERT INTO sales 
      (user_id, flock_id, quantity_sold, price_per_unit, total_amount, buyer_name, date_sold, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [user_id, flock_id, qty, price_per_unit, total_amount, buyer_name, date_sold, notes]
    );

    // Decrement flock quantity but ensure flock belongs to same user
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3', [qty, flock_id, user_id]);

    await client.query('COMMIT');

    const row = result.rows[0];
    if (row) {
      const flockResult = await db.query("SELECT name FROM flock WHERE id = $1 AND user_id = $2", [flock_id, user_id]);
      if (flockResult.rowCount > 0) {
        row.flock_name = flockResult.rows[0].name;
      }
    }
    res.json(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error("Error creating sale:", err);
    res.status(500).json({ message: "Server error creating sale", error: err.message });
  } finally {
    client.release();
  }
};

const updateSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { flock_id, quantity_sold, price_per_unit, buyer_name, date_sold, notes } = req.body;

    const qty = Number(quantity_sold);
    const total_amount = qty * Number(price_per_unit || 0);

    const user_id = req.user && req.user.id;
    await client.query('BEGIN');

    const oldRes = await client.query("SELECT * FROM sales WHERE id = $1 AND user_id = $2 FOR UPDATE", [id, user_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Sale not found" });
    }
    const oldRec = oldRes.rows[0];

    // Restore old flock quantity
    await client.query("UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3", [oldRec.quantity_sold, oldRec.flock_id, user_id]);

    // Update sale
    const result = await client.query(
      `UPDATE sales
       SET flock_id = $1, quantity_sold = $2, price_per_unit = $3, total_amount = $4, buyer_name = $5, date_sold = $6, notes = $7
       WHERE id = $8
       RETURNING *`,
      [flock_id, qty, price_per_unit, total_amount, buyer_name, date_sold, notes, id]
    );

    // Decrement new flock quantity
    await client.query("UPDATE flock SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3", [qty, flock_id, user_id]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error("Error updating sale:", err);
    res.status(500).json({ message: "Server error updating sale" });
  } finally {
    client.release();
  }
};

const deleteSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    await client.query('BEGIN');

    const oldRes = await client.query("SELECT * FROM sales WHERE id = $1 AND user_id = $2 FOR UPDATE", [id, user_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Sale not found" });
    }
    const oldRec = oldRes.rows[0];

    // Restore flock quantity
    await client.query("UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3", [oldRec.quantity_sold, oldRec.flock_id, user_id]);

    await client.query("DELETE FROM sales WHERE id = $1 AND user_id = $2", [id, user_id]);

    await client.query('COMMIT');
    res.json({ message: "Sale deleted" });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error("Error deleting sale:", err);
    res.status(500).json({ message: "Server error deleting sale" });
  } finally {
    client.release();
  }
};

module.exports = { getSales, createSale, updateSale, deleteSale };
