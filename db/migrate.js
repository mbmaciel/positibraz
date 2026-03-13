const pool = require("./pool");

const schema = `
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birthdate DATE,
  city VARCHAR(100),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by VARCHAR(20),
  referral_earnings DECIMAL(10, 2) DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  days_free INTEGER DEFAULT 0,
  money_saved DECIMAL(10, 2) DEFAULT 0,
  cigarettes_not_smoked INTEGER DEFAULT 0,
  quit_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de familiares
CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relation VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de anamnese (questionário médico)
CREATE TABLE IF NOT EXISTS anamnese (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  age INTEGER,
  sex VARCHAR(20),
  weight DECIMAL(5, 2),
  height DECIMAL(5, 2),
  smoking_time VARCHAR(50),
  cigarettes_per_day INTEGER,
  quit_attempts INTEGER,
  heart_problems VARCHAR(10),
  medications TEXT,
  allergies TEXT,
  family_smokers VARCHAR(10),
  other_drugs VARCHAR(10),
  social_support VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de posts
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  type VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de likes em posts
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Tabela de indicações
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  reward_amount DECIMAL(10, 2) DEFAULT 10.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP
);

-- Tabela de atividades do sistema
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar usuários por código de indicação
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Índice para buscar posts por usuário
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Índice para buscar atividades por usuário
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- Tabela de comentários processados (para evitar duplicatas no webhook)
CREATE TABLE IF NOT EXISTS processed_comments (
  id SERIAL PRIMARY KEY,
  comment_id VARCHAR(100) UNIQUE NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_comments_id ON processed_comments(comment_id);
`;

async function migrate() {
  try {
    console.log("Running database migration...");
    await pool.query(schema);
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate, schema };
