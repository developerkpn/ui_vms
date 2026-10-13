import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMaterialGroupChartRows,
  buildMonthlyChartScale,
  formatDashboardMonth,
} from "./materialDashboard.js";

test("group chart retains the full item total when grouping the long tail", () => {
  const groups = Array.from({ length: 9 }, (_, index) => ({
    label: `Group ${index}`,
    count: index + 1,
  }));
  const rows = buildMaterialGroupChartRows(groups);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].count, 9);
  assert.deepEqual(rows[6], { label: "Other groups", count: 6 });
  assert.equal(
    rows.reduce((sum, row) => sum + row.count, 0),
    45
  );
  assert.equal(groups[0].count, 1, "input is not reordered");
});

test("small and empty group charts do not invent an Other slice", () => {
  assert.deepEqual(buildMaterialGroupChartRows([]), []);
  assert.deepEqual(buildMaterialGroupChartRows([{ label: "Bearing", count: 20 }]), [
    { label: "Bearing", count: 20 },
  ]);
});

test("monthly scale includes single and individual mass items, with integer ticks", () => {
  for (const counts of [
    [0, 0],
    [1, 0],
    [1, 20],
    [606, 700],
    [0, 90000],
  ]) {
    const [singleItems, massItems] = counts;
    const { top, ticks } = buildMonthlyChartScale([{ singleItems, massItems }]);
    assert.ok(top >= singleItems + massItems);
    assert.equal(ticks[0], 0);
    assert.equal(ticks.at(-1), top);
    assert.ok(ticks.every(Number.isInteger));
    assert.ok(ticks.length <= 6);
  }
});

test("an empty monthly series has a finite scale and month labels preserve the calendar month", () => {
  assert.deepEqual(buildMonthlyChartScale([]), { top: 1, ticks: [0, 1] });
  assert.equal(formatDashboardMonth("2026-01"), "Jan 26");
  assert.equal(formatDashboardMonth("2025-12"), "Dec 25");
});
