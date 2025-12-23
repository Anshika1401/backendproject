import jwt from "jsonwebtoken";

export const JWT_SECRET = "jwttoken";

// ------------------- Ensure Auth (Protected Routes) -------------------
export function ensureAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    req.flash("error_msg", "Please log in first.");
    return res.redirect("/login");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.flash("error_msg", "Session expired. Please log in again.");
    res.clearCookie("token");
    res.redirect("/login");
  }
}

// ------------------- Ensure Guest (Prevent Access if Logged In) -------------------
export function ensureGuest(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect("/"); // already logged in
    } catch {
      return next(); // invalid/expired → guest
    }
  }
  next();
}

// ------------------- Admin Access -------------------
export function ensureAdmin(req, res, next) {
  if (!req.user) return res.redirect("/login");
  if (req.user.role !== "admin") {
    req.flash("error_msg", "Access denied.");
    return res.redirect("/");
  }
  next();
}

// ------------------- Logger -------------------
export function logger(req, res, next) {
  console.log(`${req.method} ${req.url} at ${new Date().toISOString()}`);
  next();
}

// ------------------- Error Handler -------------------
export function errorHandler(err, req, res, next) {
  console.error("Error:", err.stack);
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong. Please try again later."
  });
}
