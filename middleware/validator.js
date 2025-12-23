export function validateRegister(req, res, next) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.render("register", {
      layout: "layout-auth",
      title: "Register",
      error: "All fields are required!"
    });
  }

  if (!email.includes("@gmail.com")) {
    return res.render("register", {
      layout: "layout-auth",
      title: "Register",
      error: "Email must be a valid Gmail address!"
    });
  }

  if (password.length < 6) {
    return res.render("register", {
      layout: "layout-auth",
      title: "Register",
      error: "Password must be at least 6 characters!"
    });
  }

  next();
}
