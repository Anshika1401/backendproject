export function logger(req, res, next) {
  console.log(`${req.method} ${req.url} at ${new Date().toISOString()}`);
  next();
}
