const pool = require("../db/pool");

async function hasProcessed(commentId) {
  const result = await pool.query(
    "SELECT 1 FROM processed_comments WHERE comment_id = $1",
    [commentId]
  );
  return result.rows.length > 0;
}

async function markProcessed(commentId) {
  await pool.query(
    "INSERT INTO processed_comments (comment_id) VALUES ($1) ON CONFLICT (comment_id) DO NOTHING",
    [commentId]
  );
}

async function cleanupOldProcessed() {
  const result = await pool.query(
    "DELETE FROM processed_comments WHERE processed_at < NOW() - INTERVAL '24 hours'"
  );
  return result.rowCount;
}

module.exports = {
  hasProcessed,
  markProcessed,
  cleanupOldProcessed,
};
