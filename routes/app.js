const express = require("express");
const userModel = require("../models/user");
const postModel = require("../models/post");
const anamneseModel = require("../models/anamnese");
const familyModel = require("../models/family");

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await userModel.findUserById(req.session.user.id);
    res.render("profile", { user, currentUser: req.session.user });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.redirect("/");
  }
});

router.post("/profile", requireAuth, async (req, res) => {
  try {
    const { name, phone, birthdate, city } = req.body;
    await userModel.updateUser(req.session.user.id, { name, phone, birthdate, city });
    res.redirect("/profile?success=1");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.redirect("/profile?error=1");
  }
});

router.get("/anamnese", requireAuth, async (req, res) => {
  try {
    const anamnese = await anamneseModel.getAnamneseByUser(req.session.user.id);
    res.render("anamnese", { anamnese, currentUser: req.session.user });
  } catch (err) {
    console.error("Error loading anamnese:", err);
    res.redirect("/");
  }
});

router.post("/anamnese", requireAuth, async (req, res) => {
  try {
    const {
      age, sex, weight, height, smoking_time,
      cigarettes_per_day, quit_attempts, heart_problems,
      medications, allergies, family_smokers,
      other_drugs, social_support
    } = req.body;

    await anamneseModel.createOrUpdateAnamnese(req.session.user.id, {
      age: age ? parseInt(age) : null,
      sex,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      smoking_time,
      cigarettes_per_day: cigarettes_per_day ? parseInt(cigarettes_per_day) : null,
      quit_attempts: quit_attempts ? parseInt(quit_attempts) : null,
      heart_problems,
      medications,
      allergies,
      family_smokers,
      other_drugs,
      social_support,
    });

    res.redirect("/anamnese?success=1");
  } catch (err) {
    console.error("Error saving anamnese:", err);
    res.redirect("/anamnese?error=1");
  }
});

router.get("/family", requireAuth, async (req, res) => {
  try {
    const familyMembers = await familyModel.getFamilyMembers(req.session.user.id);
    res.render("family", { familyMembers, currentUser: req.session.user });
  } catch (err) {
    console.error("Error loading family:", err);
    res.redirect("/");
  }
});

router.post("/family", requireAuth, async (req, res) => {
  try {
    const { name, relation, email } = req.body;
    await familyModel.addFamilyMember(req.session.user.id, { name, relation, email });
    res.redirect("/family?success=1");
  } catch (err) {
    console.error("Error adding family member:", err);
    res.redirect("/family?error=1");
  }
});

router.post("/family/delete/:id", requireAuth, async (req, res) => {
  try {
    await familyModel.deleteFamilyMember(req.params.id, req.session.user.id);
    res.redirect("/family?deleted=1");
  } catch (err) {
    console.error("Error deleting family member:", err);
    res.redirect("/family?error=1");
  }
});

router.post("/posts", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.redirect("/?error=1");
    }
    await postModel.createPost({ userId: req.session.user.id, content: content.trim() });
    res.redirect("/?success=1");
  } catch (err) {
    console.error("Error creating post:", err);
    res.redirect("/?error=1");
  }
});

router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    await postModel.likePost(req.params.id, req.session.user.id);
    res.redirect("/");
  } catch (err) {
    console.error("Error liking post:", err);
    res.redirect("/");
  }
});

module.exports = router;
