const express = require("express");
const bcrypt = require("bcrypt");
const userModel = require("../models/user");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { error: null, user: null });
});

router.get("/register", (req, res) => {
  res.render("register", { error: null, user: null });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.render("login", { error: "Email ou senha incorretos", user: null });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.render("login", { error: "Email ou senha incorretos", user: null });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referral_code,
    };

    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Erro ao fazer login", user: null });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, referralCode } = req.body;

    if (password !== confirmPassword) {
      return res.render("register", { error: "As senhas não coincidem", user: null });
    }

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.render("register", { error: "Este email já está cadastrado", user: null });
    }

    let referredBy = null;
    if (referralCode) {
      const referrer = await userModel.findUserByReferralCode(referralCode);
      if (referrer) {
        referredBy = referralCode;
      }
    }

    const user = await userModel.createUser({ name, email, password, referredBy });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referral_code,
    };

    res.redirect("/");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { error: "Erro ao criar conta", user: null });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
