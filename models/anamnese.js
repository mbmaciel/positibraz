const pool = require("../db/pool");

async function createOrUpdateAnamnese(userId, data) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  const allowedFields = [
    "age", "sex", "weight", "height", "smoking_time",
    "cigarettes_per_day", "quit_attempts", "heart_problems",
    "medications", "allergies", "family_smokers",
    "other_drugs", "social_support"
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await pool.query(
    `INSERT INTO anamnese (user_id, ${fields.join(", ")})
     VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(", ")})
     ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}
     RETURNING *`,
    [userId, ...values]
  );

  return result.rows[0];
}

async function getAnamneseByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM anamnese WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

function calculateRecommendations(anamnese) {
  const recommendations = [];

  if (!anamnese) {
    return [{ period: "Geral", text: "Complete sua anamnese para receber recomendações personalizadas." }];
  }

  if (anamnese.cigarettes_per_day > 20) {
    recommendations.push({
      period: "Primeira semana",
      text: "Considere usar adesivos de nicotina ou bupropiona. Beba bastante água."
    });
  }

  if (anamnese.family_smokers === "sim") {
    recommendations.push({
      period: "Contínuo",
      text: "Peça apoio familiar para não fumar em casa. Evite locais onde outros fumam."
    });
  }

  if (anamnese.heart_problems === "sim") {
    recommendations.push({
      period: "Importante",
      text: "Consulte um cardiologista antes de usar medicamentos para parar de fumar."
    });
  }

  if (anamnese.social_support === "pouco" || anamnese.social_support === "nenhum") {
    recommendations.push({
      period: "Buscar",
      text: "Junte-se a grupos de apoio online ou presenciais para aumentar suas chances de sucesso."
    });
  }

  recommendations.push({
    period: "20 minutos",
    text: "Frequência cardíaca e pressão arterial diminuem."
  });

  recommendations.push({
    period: "12 horas",
    text: "Nível de monóxido de carbono no sangue normaliza."
  });

  recommendations.push({
    period: "2-12 semanas",
    text: "Circulação melhora e função pulmonar aumenta."
  });

  if (recommendations.length === 0) {
    recommendations.push({
      period: "Geral",
      text: "Parabéns por buscar ajuda! Continue firme no propósito de parar de fumar."
    });
  }

  return recommendations;
}

module.exports = {
  createOrUpdateAnamnese,
  getAnamneseByUser,
  calculateRecommendations,
};
