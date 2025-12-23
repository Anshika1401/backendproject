// routes/auth.js (ES MODULE VERSION)

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import pool from "../db.js";
import { ensureGuest, ensureAuth } from "../middleware/auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "jwttoken";

// ======================================================
// REGISTER PAGE
// ======================================================
router.get("/register", ensureGuest, (req, res) => {
  res.render("register", {
    layout: "layout-auth",
    title: "Register",
  });
});

// ======================================================
// REGISTER POST
// ======================================================
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    req.flash("error_msg", "All fields are required.");
    return res.redirect("/register");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, email, password, is_verified, role)
       VALUES ($1, $2, $3, true, $4)`,
      [username, email, hashedPassword, role]
    );

    req.flash("success_msg", "Registration successful! Login now.");
    res.redirect("/login");

  } catch (err) {
    console.error("Register error:", err);
    req.flash("error_msg", "Email already exists.");
    res.redirect("/register");
  }
});

// ======================================================
// LOGIN PAGE
// ======================================================
router.get("/login", ensureGuest, (req, res) => {
  res.render("login", {
    layout: "layout-auth",
    title: "Login",
  });
});

// ======================================================
// LOGIN POST
// ======================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("error_msg", "Enter email and password");
    return res.redirect("/login");
  }

  try {
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userQuery.rows.length === 0) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    const user = userQuery.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });

    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }

    res.redirect("/");

  } catch (err) {
    console.error("Login error:", err);
    req.flash("error_msg", "Server error");
    res.redirect("/login");
  }
});

// ======================================================
// LOGOUT
// ======================================================
router.post("/logout", ensureAuth, (req, res) => {
  res.clearCookie("token");
  req.flash("success_msg", "Logged out successfully.");
  res.redirect("/login");
});

export default router;
