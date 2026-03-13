const pool = require("../db/pool");
const bcrypt = require("bcrypt");

function generateReferralCode() {
  return "POS" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function createUser({ name, email, password, referredBy = null }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const referralCode = generateReferralCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, referral_code, referred_by, days_free, money_saved, total_referrals, referral_earnings`,
      [name, email, hashedPassword, referralCode, referredBy]
    );

    const user = userResult.rows[0];

    if (referredBy) {
      const referrerResult = await client.query(
        `UPDATE users 
         SET total_referrals = total_referrals + 1, 
             referral_earnings = referral_earnings + 10.00
         WHERE referral_code = $1
         RETURNING id, name`,
        [referredBy]
      );

      if (referrerResult.rows.length > 0) {
        const referrer = referrerResult.rows[0];
        await client.query(
          `INSERT INTO activities (user_id, content, type) 
           VALUES ($1, $2, 'referral')`,
          [referrer.id, `${referrer.name} indicou ${name} para a comunidade! Ganhou R$ 10,00 de bonificação.`]
        );

        await client.query(
          `INSERT INTO referrals (referrer_id, referred_id, status, confirmed_at)
           VALUES ((SELECT id FROM users WHERE referral_code = $1), $2, 'confirmed', NOW())`,
          [referredBy, user.id]
        );
      }
    }

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password, referral_code, referred_by, 
            days_free, money_saved, total_referrals, referral_earnings,
            phone, birthdate, city, quit_date, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, referral_code, referred_by, 
            days_free, money_saved, total_referrals, referral_earnings,
            phone, birthdate, city, quit_date, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findUserByReferralCode(code) {
  const result = await pool.query(
    `SELECT id, name, email, referral_code, referred_by, 
            days_free, money_saved, total_referrals, referral_earnings
     FROM users WHERE referral_code = $1`,
    [code]
  );
  return result.rows[0];
}

async function updateUser(id, data) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  const allowedFields = ["name", "phone", "birthdate", "city", "quit_date"];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramCount} 
     RETURNING id, name, email, referral_code, phone, birthdate, city, days_free, money_saved`,
    values
  );
  return result.rows[0];
}

async function updateUserStats(id, { daysFree, moneySaved, cigarettesNotSmoked }) {
  const result = await pool.query(
    `UPDATE users 
     SET days_free = COALESCE($2, days_free),
         money_saved = COALESCE($3, money_saved),
         cigarettes_not_smoked = COALESCE($4, cigarettes_not_smoked),
         quit_date = CASE WHEN quit_date IS NULL AND $2 > 0 THEN NOW() ELSE quit_date END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING days_free, money_saved, cigarettes_not_smoked`,
    [id, daysFree, moneySaved, cigarettesNotSmoked]
  );
  return result.rows[0];
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByReferralCode,
  updateUser,
  updateUserStats,
};
