const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "loginErrorMessage.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("getLoginErrorMessage returns backend message when available", async () => {
  const { getLoginErrorMessage } = await loadHelper();
  const error = {
    response: {
      data: {
        message: "User not found",
      },
    },
  };

  assert.equal(getLoginErrorMessage(error, "https://localhost:3001/api"), "User not found");
});

test("getLoginErrorMessage explains html responses from wrong api target", async () => {
  const { getLoginErrorMessage } = await loadHelper();
  const error = {
    response: {
      status: 404,
      data: "<!doctype html><html><body>Not Found</body></html>",
    },
  };

  assert.equal(
    getLoginErrorMessage(error, "https://localhost:3001/api"),
    "Login API mengembalikan HTML, bukan JSON (https://localhost:3001/api). Periksa VITE_URL_LOC dan pastikan backend API yang aktif."
  );
});

test("getLoginErrorMessage falls back to generic 404 guidance", async () => {
  const { getLoginErrorMessage } = await loadHelper();
  const error = {
    response: {
      status: 404,
      data: {},
    },
  };

  assert.equal(
    getLoginErrorMessage(error, "https://localhost:3001/api"),
    "Endpoint login tidak ditemukan (https://localhost:3001/api). Periksa VITE_URL_LOC dan pastikan backend berjalan di URL tersebut."
  );
});
