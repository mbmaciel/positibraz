const pool = require("../db/pool");

async function createPost({ userId, content, type = "user" }) {
  const result = await pool.query(
    `INSERT INTO posts (user_id, content, type) 
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, content, type]
  );
  return result.rows[0];
}

async function getPosts(limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT p.id, p.content, p.likes, p.comments_count, p.shares, p.type, p.created_at,
            u.id as user_id, u.name as author
     FROM posts p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

async function getPostsByUser(userId, limit = 20) {
  const result = await pool.query(
    `SELECT p.id, p.content, p.likes, p.comments_count, p.shares, p.type, p.created_at,
            u.id as user_id, u.name as author
     FROM posts p
     LEFT JOIN users u ON p.user_id = u.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function likePost(postId, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingLike = await client.query(
      `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      await client.query("ROLLBACK");
      return { liked: false, action: "removed" };
    }

    await client.query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`,
      [postId, userId]
    );

    await client.query(
      `UPDATE posts SET likes = likes + 1 WHERE id = $1`,
      [postId]
    );

    await client.query("COMMIT");
    return { liked: true, action: "added" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function deletePost(postId, userId) {
  const result = await pool.query(
    `DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id`,
    [postId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createPost,
  getPosts,
  getPostsByUser,
  likePost,
  deletePost,
};
