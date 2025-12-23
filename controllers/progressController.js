import express from 'express';
import pool from '../db.js'; // your PostgreSQL connection
import { ensureAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /progress
router.get('/', ensureAuth, async (req, res) => {
  const userId = req.user.id; // logged-in user from auth middleware

  try {
    // 1️⃣ Summary per subject/type/difficulty
    const summaryQuery = `
      SELECT subject, type, difficulty, COUNT(*) AS attempts, 
             AVG(score * 100.0 / total) AS percentage
      FROM attempts
      WHERE user_id = $1
      GROUP BY subject, type, difficulty
    `;
    const summaryResult = await pool.query(summaryQuery, [userId]);
    const summary = summaryResult.rows;

    // 2️⃣ Attempt history
    const attemptsQuery = `
      SELECT subject, difficulty, score, total, created_at,
             (score * 100.0 / total) AS percentage
      FROM attempts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const attemptsResult = await pool.query(attemptsQuery, [userId]);
    const attempts = attemptsResult.rows;

    // 3️⃣ Skill mastery data (user vs platform average)
    const skillQuery = `
      SELECT subject,
             AVG(score * 100.0 / total) FILTER (WHERE user_id = $1) AS user_score,
             AVG(score * 100.0 / total) AS avg_score
      FROM attempts
      WHERE subject IN ('Java', 'Cloud Computing', 'System Design')
      GROUP BY subject
    `;
    const skillResult = await pool.query(skillQuery, [userId]);
    const skillData = skillResult.rows.map(row => ({
      subject: row.subject,
      user_score: row.user_score || 0,
      avg_score: row.avg_score || 0
    }));

    // 4️⃣ Global leaderboard (top 5 users by avg percentage)
    const leaderboardQuery = `
      SELECT u.username,
             AVG(a.score * 100.0 / a.total) AS percentage
      FROM users u
      JOIN attempts a ON u.id = a.user_id
      GROUP BY u.id
      ORDER BY percentage DESC
      LIMIT 5
    `;
    const leaderboardResult = await pool.query(leaderboardQuery);
    const leaderboard = leaderboardResult.rows;

    res.render('progress', {
      title: 'My Progress - Path2Tech',
      summary,
      attempts,
      skillData,
      leaderboard
    });
  } catch (err) {
    console.error('Error loading progress:', err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
