import { Router } from "express";

const router = Router();

function logTrap(req) {
  const entry = {
    alert: "honeypot",
    timestamp: new Date().toISOString(),
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown",
    userAgent: req.headers["user-agent"] || "",
    method: req.method,
    path: req.originalUrl || req.path,
  };
  console.log(JSON.stringify(entry));
}

// GET /admin
router.get("/admin", (req, res) => {
  logTrap(req);
  res.status(403).type("text").send("403 Forbidden");
});

// GET /.env
router.get("/.env", (req, res) => {
  logTrap(req);
  res.status(404).type("text").send("404 Not Found");
});

// GET /wp-login.php
router.get("/wp-login.php", (req, res) => {
  logTrap(req);
  res.status(200).type("html").send(`<!DOCTYPE html>
<html><head><title>Log In</title></head>
<body>
<form method="post" action="/wp-login.php">
  <label>Username<br><input type="text" name="log"></label><br>
  <label>Password<br><input type="password" name="pwd"></label><br>
  <button type="submit">Log In</button>
</form>
</body></html>`);
});

// GET /wp-admin
router.get("/wp-admin", (req, res) => {
  logTrap(req);
  res.status(403).type("text").send("403 Forbidden");
});

// GET /.git/config
router.get("/.git/config", (req, res) => {
  logTrap(req);
  res.status(404).type("text").send("404 Not Found");
});

// GET /phpmyadmin
router.get("/phpmyadmin", (req, res) => {
  logTrap(req);
  res.status(403).type("text").send("403 Forbidden");
});

export default router;
