import express from "express";
import pool from "../db.js";
import { ensureAuth } from "../middleware/auth.js";
import { calculatePercentage } from "../utils/progressUtil.js";

// 🔴 Redis imports
import { getCache, setCache } from "../services/cacheService.js";
import redis from "../config/redis.js";

const router = express.Router();

// ================================
// SHOW PROGRESS DASHBOARD (CACHED)
// ================================
router.get("/", ensureAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `progress:${userId}`;

    // 🔥 1. CHECK REDIS CACHE FIRST
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log("⚡ Progress served from Redis");
      return res.render("progress", {
        ...cachedData,
        source: "redis"
      });
    }

    // 🔥 2. FETCH ATTEMPTS FROM DATABASE
    console.log("📀 Progress served from Database");

    const attemptsRes = await pool.query(
      `SELECT id, subject, type, difficulty, score, total, created_at
       FROM progress
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );

    const attempts = attemptsRes.rows.map(a => ({
      ...a,
      percentage: calculatePercentage(a.score, a.total)
    }));

    // 🔥 3. AGGREGATE SUMMARY DATA
    const summaryMap = {};
    attempts.forEach(r => {
      const key = `${r.subject}-${r.type}-${r.difficulty}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          subject: r.subject,
          type: r.type,
          difficulty: r.difficulty,
          attempts: 0,
          totalPercentage: 0
        };
      }
      summaryMap[key].attempts++;
      summaryMap[key].totalPercentage += Number(r.percentage);
    });

    const summary = Object.values(summaryMap).map(s => ({
      ...s,
      percentage: Number((s.totalPercentage / s.attempts).toFixed(2))
    }));

    // 🔥 4. SKILL DATA
    const skillData = [
      { subject: "Java", user_score: 70, avg_score: 65 },
      { subject: "Cloud Computing", user_score: 60, avg_score: 55 },
      { subject: "System Design", user_score: 50, avg_score: 50 }
    ];

    // 🔥 5. LEADERBOARD
    const leaderboardRes = await pool.query(
      `SELECT u.username, AVG(p.score * 100.0 / p.total) AS percentage
       FROM users u
       JOIN progress p ON u.id = p.user_id
       GROUP BY u.id
       ORDER BY percentage DESC
       LIMIT 5`
    );

    const leaderboard = leaderboardRes.rows;

    // 🔥 6. FINAL RESPONSE OBJECT
    const responseData = {
      title: "My Progress - Path2Tech",
      attempts,
      summary,
      skillData,
      leaderboard,
      source: "database"
    };

    // 🔥 7. STORE DATA IN REDIS (TTL = 120 seconds)
    await setCache(cacheKey, responseData, 120);
    console.log("📦 Progress stored in Redis");

    res.render("progress", responseData);
  } catch (err) {
    console.error("Error loading progress:", err.message);
    res.status(500).send("Error loading progress");
  }
});

// ================================
// INSERT NEW ATTEMPT + CACHE CLEAR
// ================================
router.post("/update", ensureAuth, async (req, res) => {
  try {
    const { subject, type, difficulty, score, total } = req.body;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO progress (user_id, subject, type, difficulty, score, total, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, subject, type, difficulty, score, total]
    );

    // 🔥 CLEAR REDIS CACHE AFTER UPDATE
    await redis.del(`progress:${userId}`);
    console.log("🗑️ Progress cache cleared");

    res.redirect("/progress");
  } catch (err) {
    console.error("Error updating progress:", err.message);
    res.status(500).send("Error updating progress");
  }
});

export default router;
