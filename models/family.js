const pool = require("../db/pool");

async function addFamilyMember(userId, { name, relation, email }) {
  const result = await pool.query(
    `INSERT INTO family_members (user_id, name, relation, email)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, name, relation, email]
  );
  return result.rows[0];
}

async function getFamilyMembers(userId) {
  const result = await pool.query(
    `SELECT * FROM family_members WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function deleteFamilyMember(id, userId) {
  const result = await pool.query(
    `DELETE FROM family_members WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rows[0];
}

module.exports = {
  addFamilyMember,
  getFamilyMembers,
  deleteFamilyMember,
};
