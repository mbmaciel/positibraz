require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use("/css", express.static(path.join(__dirname, "public", "css")));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";

function sendHtmlPage(pageFile) {
  return (_req, res) => {
    res.sendFile(path.join(__dirname, pageFile));
  };
}

app.get("/", sendHtmlPage("index.html"));
app.get("/privacidade", sendHtmlPage("privacidade.html"));
app.get("/termos", sendHtmlPage("termos.html"));
app.get("/exclusao", sendHtmlPage("exclusao.html"));

// Compatibilidade com links antigos
app.get("/index.html", (_req, res) => res.redirect(301, "/"));
app.get("/privacidade.html", (_req, res) => res.redirect(301, "/privacidade"));
app.get("/termos.html", (_req, res) => res.redirect(301, "/termos"));
app.get("/exclusao.html", (_req, res) => res.redirect(301, "/exclusao"));

/**
 * Função simples para decidir a resposta automática.
 * Em produção, vale usar regras melhores, banco de dados e logs.
 */
function buildAutoReply(commentText) {
  if (!commentText) {
    return null;
  }

  const text = commentText.toLowerCase().trim();

  if (text.includes("preço") || text.includes("valor") || text.includes("quanto custa")) {
    return "Olá! Obrigado pelo comentário. Para valores e condições, me chame no direct.";
  }

  if (text.includes("link")) {
    return "Olá! Posso te enviar o link no direct. Obrigado pelo interesse.";
  }

  if (text.includes("oi") || text.includes("olá")) {
    return "Olá! Obrigado pelo comentário. Como posso te ajudar?";
  }

  // Resposta padrão
  return "Obrigado pelo seu comentário! Já já retorno com mais detalhes.";
}

/**
 * Evita responder seu próprio comentário ou duplicar respostas.
 * Em produção, o ideal é gravar o comment_id em banco para idempotência.
 */
const processedComments = new Set();

function hasProcessed(commentId) {
  return processedComments.has(commentId);
}

function markProcessed(commentId) {
  processedComments.add(commentId);

  // Limpeza simples para não crescer indefinidamente em memória
  setTimeout(() => processedComments.delete(commentId), 1000 * 60 * 60);
}

/**
 * Publica uma resposta em um comentário do Instagram.
 * Pela API da Meta, a coleção de replies do comentário permite criar resposta.
 */
async function replyToInstagramComment(commentId, message) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${commentId}/replies`;

  const payload = {
    message,
    access_token: META_ACCESS_TOKEN,
  };

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

/**
 * Busca mais dados do comentário, se necessário.
 * Dependendo do payload recebido no webhook, você pode precisar consultar o comentário.
 */
async function getInstagramComment(commentId) {
  const fields = [
    "id",
    "text",
    "username",
    "timestamp",
    "parent_id",
    "media"
  ].join(",");

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${commentId}`;

  const response = await axios.get(url, {
    params: {
      fields,
      access_token: META_ACCESS_TOKEN,
    },
  });

  return response.data;
}

/**
 * Endpoint de verificação do webhook da Meta
 */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * Endpoint que recebe eventos do Instagram
 */
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // Sempre responda 200 rapidamente para a Meta
    res.sendStatus(200);

    if (!body || body.object !== "instagram") {
      console.log("Evento ignorado: objeto não é instagram.");
      return;
    }

    // Estrutura pode variar conforme o tipo de evento recebido
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const field = change.field;
        const value = change.value;

        // Dependendo da assinatura do webhook, você vai filtrar aqui
        // Exemplo prático: evento relacionado a comentário
        if (field !== "comments") {
          continue;
        }

        // Alguns payloads trazem comment_id ou id
        const commentId = value.comment_id || value.id;
        if (!commentId) {
          console.log("Evento sem commentId:", JSON.stringify(value));
          continue;
        }

        if (hasProcessed(commentId)) {
          console.log(`Comentário ${commentId} já processado.`);
          continue;
        }

        markProcessed(commentId);

        let commentData = null;

        try {
          commentData = await getInstagramComment(commentId);
        } catch (err) {
          console.error("Erro ao buscar dados do comentário:", err.response?.data || err.message);
          continue;
        }

        const commentText = commentData?.text || "";
        const username = commentData?.username || "usuário";

        console.log("Novo comentário recebido:", {
          commentId,
          username,
          commentText,
        });

        const replyMessage = buildAutoReply(commentText);

        if (!replyMessage) {
          console.log("Nenhuma resposta gerada.");
          continue;
        }

        try {
          const result = await replyToInstagramComment(commentId, replyMessage);
          console.log("Resposta publicada com sucesso:", result);
        } catch (err) {
          console.error("Erro ao responder comentário:", err.response?.data || err.message);
        }
      }
    }
  } catch (err) {
    console.error("Erro geral no webhook:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
