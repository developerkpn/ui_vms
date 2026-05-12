const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readSource(...segments) {
  return fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8");
}

const loginPageSource = readSource("pages", "LoginPage.jsx");
const dashboardSource = readSource("pages", "dashboard", "Dashboard.jsx");

assert.doesNotMatch(
  loginPageSource,
  /console\.log\s*\(\s*response\s*\)/,
  "LoginPage should not log the login response payload to the browser console"
);

assert.doesNotMatch(
  dashboardSource,
  /console\.log\s*\(\s*data\s*\)/,
  "Dashboard should not log the session payload to the browser console"
);
