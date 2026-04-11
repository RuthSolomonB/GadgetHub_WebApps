import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOAD_TEST_PRODUCT_SKU,
  DEFAULT_LOAD_TEST_USER_PASSWORD,
  DEFAULT_LOAD_TEST_USER_PREFIX,
} from "../server/data/loadTestProduct.js";

const TERMINAL_STATUSES = new Set([201, 400, 401, 403, 500]);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const k6ScriptPath = resolve(scriptDirectory, "flash-sale-checkout.js");

const baseUrl = process.env.LOAD_TEST_BASE_URL || "http://localhost:5000";
const productSku = (process.env.LOAD_TEST_PRODUCT_SKU || DEFAULT_LOAD_TEST_PRODUCT_SKU)
  .trim()
  .toUpperCase();
const requestTimeoutMs = parsePositiveInteger(process.env.LOAD_TEST_REQUEST_TIMEOUT_MS, 5_000);
const runId = process.env.LOAD_TEST_RUN_ID || `${Date.now()}`;
const summaryPath = process.env.LOAD_TEST_SUMMARY_PATH || "";
const userPassword = process.env.LOAD_TEST_USER_PASSWORD || DEFAULT_LOAD_TEST_USER_PASSWORD;
const userPrefix = process.env.LOAD_TEST_USER_PREFIX || DEFAULT_LOAD_TEST_USER_PREFIX;
const virtualUsers = parsePositiveInteger(process.env.LOAD_TEST_VUS, 10);
const durationMs = parseDurationMs(process.env.LOAD_TEST_DURATION || "15s", 15_000);
const pauseMs = parsePositiveInteger(process.env.LOAD_TEST_PAUSE_MS, 1_000);

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

async function parseResponse(response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
}

async function requestJson(path, { body, headers = {}, method = "GET", token } = {}) {
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(new URL(path, baseUrl), {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: requestHeaders,
    method,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  return {
    body: await parseResponse(response),
    response,
  };
}

async function registerOrLoginUser(userIndex) {
  const email = `${userPrefix}+${runId}-${userIndex}@gadgethub.local`;
  const displayName = `Load Test User ${userIndex}`;
  const registerResult = await requestJson("/api/auth/register", {
    body: {
      displayName,
      email,
      password: userPassword,
    },
    method: "POST",
  });

  if (registerResult.response.status === 201 && registerResult.body?.token) {
    return registerResult.body.token;
  }

  if (registerResult.response.status !== 409) {
    throw new Error(`User bootstrap failed with status ${registerResult.response.status}.`);
  }

  const loginResult = await requestJson("/api/auth/login", {
    body: {
      email,
      password: userPassword,
    },
    method: "POST",
  });

  if (loginResult.response.status !== 200 || !loginResult.body?.token) {
    throw new Error(`Login failed with status ${loginResult.response.status}.`);
  }

  return loginResult.body.token;
}

async function findTargetProductId() {
  const productResult = await requestJson(
    `/api/products?sku=${encodeURIComponent(productSku)}&limit=1`
  );

  if (productResult.response.status !== 200) {
    throw new Error(`Product lookup failed with status ${productResult.response.status}.`);
  }

  const productId = productResult.body?.items?.[0]?.id;

  if (!productId) {
    throw new Error(`No active product found for SKU ${productSku}.`);
  }

  return productId;
}

async function clearCart(token) {
  const clearResult = await requestJson("/api/cart", {
    method: "DELETE",
    token,
  });

  if (clearResult.response.status !== 200) {
    throw new Error(`Cart reset failed with status ${clearResult.response.status}.`);
  }
}

async function addProductToCart(token, productId) {
  const cartResult = await requestJson("/api/cart/items", {
    body: {
      productId,
      quantity: 1,
    },
    method: "POST",
    token,
  });

  if (cartResult.response.status === 201) {
    return null;
  }

  if (cartResult.response.status === 400) {
    return 400;
  }

  throw new Error(`Add-to-cart failed with status ${cartResult.response.status}.`);
}

async function checkout(token) {
  const checkoutResult = await requestJson("/api/checkout", {
    method: "POST",
    token,
  });

  if (!TERMINAL_STATUSES.has(checkoutResult.response.status)) {
    throw new Error(`Checkout failed with unexpected status ${checkoutResult.response.status}.`);
  }

  return checkoutResult.response.status;
}

function buildSummary() {
  return {
    bootstrapErrors: 0,
    completedIterations: 0,
    durationMs,
    lastBootstrapError: "",
    lastNetworkError: "",
    latenciesMs: [],
    networkErrors: 0,
    productSku,
    runId,
    statusCounts: {},
    unexpectedResponses: 0,
    virtualUsers,
  };
}

function recordTerminalResult(summary, status, latencyMs) {
  summary.completedIterations += 1;
  summary.latenciesMs.push(latencyMs);
  summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;

  if (!TERMINAL_STATUSES.has(status)) {
    summary.unexpectedResponses += 1;
  }
}

function printSummary(summary) {
  const averageLatencyMs =
    summary.latenciesMs.length > 0
      ? summary.latenciesMs.reduce((total, latency) => total + latency, 0) / summary.latenciesMs.length
      : 0;
  const statusLine =
    Object.entries(summary.statusCounts)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([status, count]) => `${status}=${count}`)
      .join(", ") || "none";

  console.log(`Completed iterations: ${summary.completedIterations}`);
  console.log(`HTTP statuses: ${statusLine}`);
  console.log(`Bootstrap errors: ${summary.bootstrapErrors}`);
  console.log(`Network errors: ${summary.networkErrors}`);
  console.log(`Average latency: ${averageLatencyMs.toFixed(1)}ms`);
  console.log(`P95 latency: ${percentile(summary.latenciesMs, 0.95).toFixed(1)}ms`);

  if (summary.lastBootstrapError) {
    console.error(`Last bootstrap error: ${summary.lastBootstrapError}`);
  }

  if (summary.lastNetworkError) {
    console.error(`Last network error: ${summary.lastNetworkError}`);
  }
}

async function writeSummaryFile(summary) {
  if (!summaryPath) {
    return;
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const summaryDirectory = dirname(summaryPath);
  await mkdir(summaryDirectory, { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function runFallbackLoadTest() {
  const deadline = Date.now() + durationMs;
  const summary = buildSummary();

  console.warn("k6 was not found in PATH. Running the built-in Node load runner instead.");
  console.log(`Target: ${new URL("/api/checkout", baseUrl)}`);
  console.log(`Product SKU: ${productSku}`);
  console.log(`Virtual users: ${virtualUsers}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(0)}s`);

  async function runVirtualUser(userIndex) {
    let token;
    let productId;

    try {
      token = await registerOrLoginUser(userIndex);
      productId = await findTargetProductId();
    } catch (error) {
      summary.bootstrapErrors += 1;
      summary.lastBootstrapError = error instanceof Error ? error.message : String(error);
      return;
    }

    while (Date.now() < deadline) {
      const startedAt = performance.now();

      try {
        await clearCart(token);
        const addToCartStatus = await addProductToCart(token, productId);
        const terminalStatus = addToCartStatus ?? (await checkout(token));
        recordTerminalResult(summary, terminalStatus, performance.now() - startedAt);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("fetch")) {
          summary.networkErrors += 1;
          summary.lastNetworkError = errorMessage;
        } else {
          summary.bootstrapErrors += 1;
          summary.lastBootstrapError = errorMessage;
        }
      }

      await delay(pauseMs);
    }
  }

  await Promise.all(Array.from({ length: virtualUsers }, (_, index) => runVirtualUser(index + 1)));

  printSummary(summary);
  await writeSummaryFile(summary);

  if (summary.completedIterations === 0) {
    console.error("The load test did not reach any terminal checkout state.");
    process.exit(1);
  }

  if (summary.bootstrapErrors > 0 || summary.networkErrors > 0 || summary.unexpectedResponses > 0) {
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
