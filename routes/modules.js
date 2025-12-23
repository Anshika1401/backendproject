// routes/modules.js (ESM)

import express from "express";
import pool from "../db.js";
import { calculatePercentage } from "../utils/progressUtil.js";
import { ensureAuth } from "../middleware/auth.js";

const router = express.Router();

/* ---------------------- THEORY PAGE ---------------------- */
router.get("/:subject/Theory", ensureAuth, async (req, res) => {
  const { subject } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM notes WHERE subject=$1 ORDER BY id`,
      [subject]
    );

    res.render("notesPage", {
      title: `${subject} - Theory`,
      subject,
      notes: result.rows,
      user: req.user
    });
  } catch (err) {
    console.error("Error loading theory:", err);
    req.flash("error_msg", "Failed to load theory.");
    res.redirect("/");
  }
});

/* ---------------------- NOTES PAGE (PLACE THIS FIRST!!) ---------------------- */
router.get("/:subject/Notes/:difficulty", ensureAuth, async (req, res) => {
  const { subject, difficulty } = req.params;

  try {
    const notes = await pool.query(
      `SELECT * FROM notes WHERE subject=$1 AND difficulty=$2 ORDER BY id`,
      [subject, difficulty]
    );

    res.render("notesPage", {
      title: `${subject} Notes (${difficulty})`,
      subject,
      difficulty,
      notes: notes.rows,
      user: req.user
    });
  } catch (err) {
    console.error("Error loading notes:", err);
    req.flash("error_msg", "Failed to load notes.");
    res.redirect("/");
  }
});

/* ---------------------- MARK NOTE AS READ ---------------------- */
router.post("/mark-read/:note_id", ensureAuth, async (req, res) => {
  const user_id = req.user.id;
  const note_id = req.params.note_id;

  try {
    await pool.query(
      `INSERT INTO notes_read (user_id, note_id, read_at)
       VALUES ($1, $2, NOW())`,
      [user_id, note_id]
    );

    req.flash("success_msg", "Marked as read!");
    res.redirect("back");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error marking as read");
    res.redirect("back");
  }
});

/* ---------------------- MCQ PAGE ---------------------- */
router.get("/:subject/:type/:difficulty", ensureAuth, async (req, res) => {
  const { subject, type, difficulty } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM modules 
       WHERE subject=$1 AND type=$2 AND difficulty=$3 
       ORDER BY id`,
      [subject, type, difficulty]
    );

    const questions = result.rows.map(q => ({
      ...q,
      options: Array.isArray(q.options)
        ? q.options
        : JSON.parse(q.options || "[]")
    }));

    res.render("modules", {
      title: `${subject} - ${type} - ${difficulty}`,
      questions,
      subject,
      type,
      difficulty,
      currentPath: req.originalUrl,
      user: req.user
    });
  } catch (err) {
    console.error("Error fetching questions:", err);
    req.flash("error_msg", "Failed to load questions.");
    res.redirect("/");
  }
});

/* ---------------------- MCQ SUBMIT ---------------------- */
router.post("/:subject/:type/:difficulty", ensureAuth, async (req, res) => {
  const { subject, type, difficulty } = req.params;
  const user_id = req.user.id;

  const answers = {};
  for (const key in req.body) {
    if (key.startsWith("q")) {
      answers[key.slice(1)] = req.body[key];
    }
  }

  try {
    const result = await pool.query(
      `SELECT id, question, correct_answer, explanation 
       FROM modules 
       WHERE subject=$1 AND type=$2 AND difficulty=$3
       ORDER BY id`,
      [subject, type, difficulty]
    );

    const feedback = result.rows.map(q => {
      const userAnswer = answers[q.id] || "(No Answer)";
      const correctAnswer = q.correct_answer || "";
      const isCorrect =
        userAnswer.trim().toLowerCase() ===
        correctAnswer.trim().toLowerCase();

      return { ...q, userAnswer, correctAnswer, isCorrect };
    });

    const score = feedback.filter(f => f.isCorrect).length;
    const total = feedback.length;
    const percentage = calculatePercentage(score, total);

    await pool.query(
      `INSERT INTO progress 
       (user_id, subject, type, difficulty, score, total, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [user_id, subject, type, difficulty, score, total]
    );

    res.render("modulesResult", {
      title: `${subject} - ${difficulty} Results`,
      feedback,
      subject,
      type,
      difficulty,
      score,
      total,
      percentage
    });
  } catch (err) {
    console.error("Error processing submission:", err);
    req.flash("error_msg", "Error submitting your answers.");
    res.redirect(`/modules/${subject}/${type}/${difficulty}`);
  }
});

export default router;
