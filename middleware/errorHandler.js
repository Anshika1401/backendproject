export function errorHandler(err, req, res, next) {
  console.error("Error:", err.stack);
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong. Please try again later."
  });
}
