import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const helperDir = path.dirname(fileURLToPath(import.meta.url));
const toDataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

const adminApprovalDetailSource = fs.readFileSync(
  path.resolve(helperDir, "adminApprovalDetail.js"),
  "utf8"
);

test("buildApprovalDetail source maps moving_avg_price to basicInfo.price and fieldHistory", () => {
  assert.match(adminApprovalDetailSource, /movingAvgPrice = pickText\([\s\S]*row\.moving_avg_price/);
  assert.match(adminApprovalDetailSource, /price:\s*movingAvgPrice/);
  assert.match(adminApprovalDetailSource, /"moving_avg_price"/);
});
