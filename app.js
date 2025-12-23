// app.mjs
import "dotenv/config";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import flash from "connect-flash";
import path from "path";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import axios from "axios";
import { fileURLToPath } from "url";

// -------------------
// Routes
// -------------------
import progressRoutes from "./routes/progress.js";
import moduleRoutes from "./routes/modules.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import codingRoutes from "./routes/coding.js";

// -------------------
// Middleware
// -------------------
import { ensureAuth, ensureGuest, logger, errorHandler } from "./middleware/auth.js";

// -------------------
// Secrets
// -------------------
const JWT_SECRET = process.env.JWT_SECRET || "jwttoken";
const SESSION_SECRET = process.env.SESSION_SECRET || "path2tech_secret";

// -------------------
// __dirname replacement (ESM)
// -------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------
// Express App
// -------------------
const app = express();

// -------------------
// Body Parsing
// -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------
// Cookie Parser
// -------------------
app.use(cookieParser());

// -------------------
// Session Setup
// -------------------
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);

// -------------------
// Flash Messages
// -------------------
app.use(flash());

// -------------------
// Logger
// -------------------
app.use(logger);

// -------------------
// EJS Setup
// -------------------
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "partials/layout");

// -------------------
// Static Files
// -------------------
app.use(express.static(path.join(__dirname, "public")));

// -------------------
// JWT User Verification
// -------------------
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      res.clearCookie("token");
    }
  }
  next();
});

// -------------------
// Global Template Variables
// -------------------
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.currentPath = req.path;
  next();
});

// -------------------
// Routes
// -------------------
app.use("/", authRoutes);
app.use("/progress", ensureAuth, progressRoutes);
app.use("/modules", ensureAuth, moduleRoutes);
app.use("/admin", ensureAuth, adminRoutes);
app.use("/coding", ensureAuth, codingRoutes);

// -------------------
// Home Route
// -------------------
app.get("/", (req, res) => {
  if (!req.user) return res.redirect("/login");
  if (req.user.role === "admin") return res.redirect("/admin/dashboard");
  res.render("index", { title: "Home - Path2Tech" });
});

// -------------------
// 404 Handler
// -------------------
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404 - Not Found",
    message: "Page not found.",
  });
});

// -------------------
// Error Handler
// -------------------
app.use(errorHandler);

// -------------------
// Start HTTP Server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 HTTP Server running at http://localhost:${PORT}`);
});

export default app;
