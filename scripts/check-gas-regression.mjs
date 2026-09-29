#!/usr/bin/env node
/**
 * Compare a contract gas report to the committed baseline and fail on a >10%
 * CPU or memory increase (issue #229).
 *
 * Usage:
 *   node scripts/check-gas-regression.mjs --baseline FILE --current FILE
 *   node scripts/check-gas-regression.mjs --self-test
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_THRESHOLD = 10;

function parseArgs(argv) {
  const args = { selfTest: false, baseline: null, current: null, threshold: DEFAULT_THRESHOLD };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--self-test") args.selfTest = true;
    else if (a === "--baseline") args.baseline = argv[++i];
    else if (a === "--current") args.current = argv[++i];
    else if (a === "--threshold") args.threshold = Number(argv[++i]);
  }
  return args;
}

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function exceeds(actual, baseline, pct) {
  const a = Number(actual);
  const b = Number(baseline);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (b === 0) return false;
  return a > b + (b * pct) / 100;
}

export function compareReports(baselineDoc, currentDoc, threshold = DEFAULT_THRESHOLD) {
  const pct = Number(baselineDoc.regression_threshold_pct || threshold);
  const baseOps = baselineDoc.operations || {};
  const currOps = currentDoc.operations || {};
  const failures = [];
  const skipped = [];

  for (const [name, measured] of Object.entries(currOps)) {
    const base = baseOps[name];
    if (!base) {
      failures.push(`${name}: missing from baseline (cpu=${measured.cpu}, mem=${measured.mem})`);
      continue;
    }
    if (!base.cpu && !base.mem) {
      skipped.push(name);
      continue;
    }
    if (exceeds(measured.cpu, base.cpu, pct)) {
      failures.push(
        `${name}: CPU ${measured.cpu} > 10% over baseline ${base.cpu} (limit ${base.cpu + (base.cpu * pct) / 100})`,
      );
    }
    if (exceeds(measured.mem, base.mem, pct)) {
      failures.push(
        `${name}: memory ${measured.mem} > 10% over baseline ${base.mem} (limit ${base.mem + (base.mem * pct) / 100})`,
      );
    }
  }

  return { pct, failures, skipped, measured: Object.keys(currOps).length };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function selfTest() {
  assert(!exceeds(1099, 1000, 10), "1099 should be within 10% of 1000");
  assert(exceeds(1101, 1000, 10), "1101 should exceed 10% of 1000");
  assert(!exceeds(500, 0, 10), "zero baseline is treated as unseeded");

  const pass = compareReports(
    { regression_threshold_pct: 10, operations: { buy_prompt: { cpu: 1000, mem: 200 } } },
    { operations: { buy_prompt: { cpu: 1090, mem: 210 } } },
  );
  assert(pass.failures.length === 0, `expected pass, got ${pass.failures}`);

  const failCpu = compareReports(
    { regression_threshold_pct: 10, operations: { buy_prompt: { cpu: 1000, mem: 200 } } },
    { operations: { buy_prompt: { cpu: 1200, mem: 200 } } },
  );
  assert(failCpu.failures.length === 1, `expected CPU failure, got ${failCpu.failures}`);

  const failMem = compareReports(
    { regression_threshold_pct: 10, operations: { buy_prompt: { cpu: 1000, mem: 200 } } },
    { operations: { buy_prompt: { cpu: 1000, mem: 250 } } },
  );
  assert(failMem.failures.length === 1, `expected memory failure, got ${failMem.failures}`);

  console.log("check-gas-regression self-test passed");
}

function main() {
  const args = parseArgs(process.argv);
  if (args.selfTest) {
    selfTest();
    return;
  }
  if (!args.baseline || !args.current) {
    console.error("Usage: node scripts/check-gas-regression.mjs --baseline FILE --current FILE");
    process.exit(2);
  }
  const result = compareReports(load(args.baseline), load(args.current), args.threshold);
  console.log(`Compared ${result.measured} operations (threshold ${result.pct}%).`);
  if (result.skipped.length) {
    console.log(`Unseeded baselines (skipped): ${result.skipped.join(", ")}`);
  }
  if (result.failures.length) {
    console.error(`gas regression (>${result.pct}%) detected:\n  ${result.failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("No gas regressions.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
