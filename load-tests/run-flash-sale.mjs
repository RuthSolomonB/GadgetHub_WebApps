import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const TERMINAL_STATUSES = new Set([201, 400, 401, 403, 500]);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const k6ScriptPath = resolve(scriptDirectory, "flash-sale-checkout.js");

const baseUrl = process.env.LOAD_TEST_BASE_URL || "http://localhost:5000";
const authToken = process.env.LOAD_TEST_TOKEN || "";
const virtualUsers = parsePositiveInteger(process.env.LOAD_TEST_VUS, 10);
const durationMs = parseDurationMs(process.env.LOAD_TEST_DURATION || "15s", 15_000);
const pauseMs = parsePositiveInteger(process.env.LOAD_TEST_PAUSE_MS, 1_000);
const requestTimeoutMs = parsePositiveInteger(process.env.LOAD_TEST_REQUEST_TIMEOUT_MS, 5_000);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDurationMs(value, fallback) {
  if (!value) {
    return fallback;
  }

  const durationMatch = value.trim().match(/^(\d+)(ms|s|m)?$/i);

  if (!durationMatch) {
    return fallback;
  }

  const amount = Number.parseInt(durationMatch[1], 10);
  const unit = (durationMatch[2] || "ms").toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return fallback;
  }

  if (unit === "m") {
    return amount * 60_000;
  }

  if (unit === "s") {
    return amount * 1_000;
  }

  return amount;
}

function tryK6() {
  const result = spawnSync("k6", ["run", k6ScriptPath], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    return false;
  }

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

function percentile(values, percentileRank) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * percentileRank) - 1);
  return sorted[index];
}

async function runFallbackLoadTest() {
  const summary = {
    latenciesMs: [],
    lastNetworkError: "",
    networkErrors: 0,
    requestCount: 0,
    statusCounts: new Map(),
    unexpectedResponses: 0,
  };
  const deadline = Date.now() + durationMs;
  const endpoint = new URL("/api/checkout", baseUrl).toString();

  console.warn("k6 was not found in PATH. Running the built-in Node load runner instead.");
  console.log(`Target: ${endpoint}`);
  console.log(`Virtual users: ${virtualUsers}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(0)}s`);

  async function runVirtualUser() {
    while (Date.now() < deadline) {
      const startedAt = performance.now();

      try {
        const response = await fetch(endpoint, {
          headers: authToken
            ? {
                Authorization: `Bearer ${authToken}`,
              }
            : {},
          method: "POST",
          signal: AbortSignal.timeout(requestTimeoutMs),
        });

        summary.requestCount += 1;
        summary.latenciesMs.push(performance.now() - startedAt);
        summary.statusCounts.set(
          response.status,
          (summary.statusCounts.get(response.status) || 0) + 1
        );

        if (!TERMINAL_STATUSES.has(response.status)) {
          summary.unexpectedResponses += 1;
        }

        await response.arrayBuffer();
      } catch (error) {
        summary.networkErrors += 1;
        summary.lastNetworkError = error instanceof Error ? error.message : String(error);
      }

      await delay(pauseMs);
    }
  }

  await Promise.all(Array.from({ length: virtualUsers }, () => runVirtualUser()));

  const averageLatencyMs =
    summary.latenciesMs.length > 0
      ? summary.latenciesMs.reduce((total, latency) => total + latency, 0) / summary.latenciesMs.length
      : 0;
  const statusLine =
    [...summary.statusCounts.entries()]
      .sort(([left], [right]) => left - right)
      .map(([status, count]) => `${status}=${count}`)
      .join(", ") || "none";

  console.log(`Completed requests: ${summary.requestCount}`);
  console.log(`HTTP statuses: ${statusLine}`);
  console.log(`Network errors: ${summary.networkErrors}`);
  console.log(`Average latency: ${averageLatencyMs.toFixed(1)}ms`);
  console.log(`P95 latency: ${percentile(summary.latenciesMs, 0.95).toFixed(1)}ms`);

  if (summary.lastNetworkError) {
    console.error(`Last network error: ${summary.lastNetworkError}`);
  }

  if (summary.requestCount === 0) {
    console.error("The checkout endpoint did not return any HTTP responses.");
    process.exit(1);
  }

  if (summary.networkErrors > 0 || summary.unexpectedResponses > 0) {
    process.exit(1);
  }
}

async function main() {
  if (!tryK6()) {
    await runFallbackLoadTest();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
