// routes/admin.js (ES MODULE VERSION)

import express from "express";
import pool from "../db.js";

// Middleware
import { ensureAuth, ensureAdmin } from "../middleware/auth.js";

const router = express.Router();

// ======================================================
// ADMIN HOME → SHOW ALL QUESTIONS
// ======================================================
router.get("/dashboard", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM modules ORDER BY id ASC");
    const questions = result.rows;

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      questions,
      user: req.user,
      activeTab: "dashboard",
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    req.flash("error_msg", "Unable to load dashboard.");
    res.redirect("/login");
  }
});

// ======================================================
// ADD QUESTION PAGE
// ======================================================
router.get("/add", ensureAuth, ensureAdmin, (req, res) => {
  res.render("admin/add", {
    title: "Add Question",
    user: req.user,
  });
});

// ======================================================
// ADD QUESTION (POST)
// ======================================================
router.post("/add", ensureAuth, ensureAdmin, async (req, res) => {
  const {
    subject,
    type,
    difficulty,
    question,
    options,
    correct_answer,
    explanation,
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO modules 
       (subject, type, difficulty, question, options, correct_answer, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        subject,
        type,
        difficulty,
        question,
        options.split(","),
        correct_answer,
        explanation,
      ]
    );

    req.flash("success_msg", "Question added successfully!");
    res.redirect("/admin/dashboard");

  } catch (err) {
    console.error("Add question error:", err);
    req.flash("error_msg", "Failed to add question.");
    res.redirect("/admin/dashboard");
  }
});

// ======================================================
// EDIT QUESTION PAGE
// ======================================================
router.get("/edit/:id", ensureAuth, ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM modules WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      req.flash("error_msg", "Question not found.");
      return res.redirect("/admin/dashboard");
    }

    res.render("admin/edit", {
      title: "Edit Question",
      question: result.rows[0],
      user: req.user,
    });

  } catch (err) {
    console.error("Load edit question error:", err);
    req.flash("error_msg", "Unable to load question.");
    res.redirect("/admin/dashboard");
  }
});

// ======================================================
// UPDATE QUESTION
// ======================================================
router.post("/edit/:id", ensureAuth, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    subject,
    type,
    difficulty,
    question,
    options,
    correct_answer,
    explanation,
  } = req.body;

  try {
    await pool.query(
      `UPDATE modules
       SET subject=$1, type=$2, difficulty=$3, question=$4,
           options=$5, correct_answer=$6, explanation=$7
       WHERE id=$8`,
      [
        subject,
        type,
        difficulty,
        question,
        options.split(","),
        correct_answer,
        explanation,
        id,
      ]
    );

    req.flash("success_msg", "Question updated successfully!");
    res.redirect("/admin/dashboard");

  } catch (err) {
    console.error("Update question error:", err);
    req.flash("error_msg", "Failed to update question.");
    res.redirect("/admin/dashboard");
  }
});

// ======================================================
// DELETE QUESTION
// ======================================================
router.post("/delete/:id", ensureAuth, ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM modules WHERE id = $1", [id]);

    req.flash("success_msg", "Question deleted successfully!");
    res.redirect("/admin/dashboard");

  } catch (err) {
    console.error("Delete question error:", err);
    req.flash("error_msg", "Failed to delete question.");
    res.redirect("/admin/dashboard");
  }
});

// ======================================================
// USERS LIST
// ======================================================
router.get("/users", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, created_at
       FROM users
       ORDER BY id ASC`
    );

    res.render("admin/users", {
      title: "Registered Users",
      users: result.rows,
      activeTab: "users",
      user: req.user,
    });

  } catch (err) {
    console.error("Users list error:", err);
    req.flash("error_msg", "Unable to fetch users.");
    res.redirect("/admin/dashboard");
  }
});

// ======================================================
// DELETE USER (CASCADE HANDLED BY DB)
// ======================================================
router.post("/users/delete/:id", ensureAuth, ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    req.flash("success_msg", "User deleted successfully!");
    res.redirect("/admin/users");

  } catch (err) {
    console.error("Delete user error:", err);
    req.flash("error_msg", "Failed to delete user.");
    res.redirect("/admin/users");
  }
});

// ======================================================
// USER PROGRESS
// ======================================================
router.get("/userProgress", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.user_id, p.subject, p.type, p.difficulty,
        p.score, p.total, p.created_at,
        u.username, u.email
      FROM progress p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.render("admin/userProgress", {
      title: "User Progress",
      progressRecords: result.rows,
      activeTab: "progress",
      user: req.user,
    });

  } catch (err) {
    console.error("Progress error:", err);
    req.flash("error_msg", "Unable to load user progress.");
    res.redirect("/admin/dashboard");
  }
});

export default router;
