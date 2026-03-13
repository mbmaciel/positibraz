require("dotenv").config();

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const authRoutes = require("./routes/auth");
const appRoutes = require("./routes/app");
const userModel = require("./models/user");
const postModel = require("./models/post");
const familyModel = require("./models/family");
const anamneseModel = require("./models/anamnese");
const webhookModel = require("./models/webhook");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "positivamente-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/css", express.static(path.join(__dirname, "public", "css")));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

app.use("/", authRoutes);
app.use("/", appRoutes);

app.get("/", requireAuth, (req, res) => {
  res.redirect("/feed");
});

app.get("/feed", requireAuth, async (req, res) => {
  try {
    const user = await userModel.findUserById(req.session.user.id);
    const posts = await postModel.getPosts(20);
    const familyMembers = await familyModel.getFamilyMembers(req.session.user.id);
    const anamnese = await anamneseModel.getAnamneseByUser(req.session.user.id);

    res.render("index", {
      currentUser: req.session.user,
      user,
      posts,
      familyMembers,
      anamnese,
      title: "Positivamente",
    });
  } catch (err) {
    console.error("Error loading feed:", err);
    res.status(500).send("Erro ao carregar feed: " + err.message);
  }
});

app.get("/privacidade", (_req, res) => {
  res.render("privacidade", { title: "Política de Privacidade" });
});

app.get("/termos", (_req, res) => {
  res.render("termos", { title: "Termos de Serviço" });
});

app.get("/exclusao", (_req, res) => {
  res.render("exclusao", { title: "Exclusão de Dados" });
});

app.get("/index.html", (_req, res) => res.redirect(301, "/"));
app.get("/privacidade.html", (_req, res) => res.redirect(301, "/privacidade"));
app.get("/termos.html", (_req, res) => res.redirect(301, "/termos"));
app.get("/exclusao.html", (_req, res) => res.redirect(301, "/exclusao"));

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

  return "Obrigado pelo seu comentário! Já já retorno com mais detalhes.";
}

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

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    res.sendStatus(200);

    await webhookModel.cleanupOldProcessed();

    if (!body || body.object !== "instagram") {
      console.log("Evento ignorado: objeto não é instagram.");
      return;
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const field = change.field;
        const value = change.value;

        if (field !== "comments") {
          continue;
        }

        const commentId = value.comment_id || value.id;
        if (!commentId) {
          console.log("Evento sem commentId:", JSON.stringify(value));
          continue;
        }

        if (await webhookModel.hasProcessed(commentId)) {
          console.log(`Comentário ${commentId} já processado.`);
          continue;
        }

        await webhookModel.markProcessed(commentId);

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
