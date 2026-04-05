/* global __ENV, __VU */
import http from "k6/http";
import { check, fail, sleep } from "k6";
import {
  DEFAULT_LOAD_TEST_PRODUCT_SKU,
  DEFAULT_LOAD_TEST_USER_PASSWORD,
  DEFAULT_LOAD_TEST_USER_PREFIX,
} from "../server/data/loadTestProduct.js";

const runtimeEnv = typeof __ENV === "undefined" ? {} : __ENV;
const baseUrl = runtimeEnv.LOAD_TEST_BASE_URL || "http://localhost:5000";
const productSku = (runtimeEnv.LOAD_TEST_PRODUCT_SKU || DEFAULT_LOAD_TEST_PRODUCT_SKU)
  .trim()
  .toUpperCase();
const pauseSeconds = Number.parseInt(runtimeEnv.LOAD_TEST_PAUSE_MS || "1000", 10) / 1000;
const runId = runtimeEnv.LOAD_TEST_RUN_ID || `${Date.now()}`;
const userPassword = runtimeEnv.LOAD_TEST_USER_PASSWORD || DEFAULT_LOAD_TEST_USER_PASSWORD;
const userPrefix = runtimeEnv.LOAD_TEST_USER_PREFIX || DEFAULT_LOAD_TEST_USER_PREFIX;

let cachedProductId;
let cachedToken;

export const options = {
  vus: Number.parseInt(runtimeEnv.LOAD_TEST_VUS || "10", 10),
  duration: runtimeEnv.LOAD_TEST_DURATION || "15s",
};

function parseJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function request(path, { body, headers = {}, method = "GET", token } = {}) {
  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  return http.request(method, `${baseUrl}${path}`, body === undefined ? null : JSON.stringify(body), {
    headers: requestHeaders,
  });
}

function getUserEmail() {
  return `${userPrefix}+${runId}-${__VU}@gadgethub.local`;
}

function ensureUserToken() {
  if (cachedToken) {
    return cachedToken;
  }

  const email = getUserEmail();
  const displayName = `Load Test User ${__VU}`;
  const registerResponse = request("/api/auth/register", {
    body: {
      displayName,
      email,
      password: userPassword,
    },
    method: "POST",
  });

  if (registerResponse.status === 201) {
    const registerBody = parseJson(registerResponse);
    cachedToken = registerBody?.token;
  } else if (registerResponse.status === 409) {
    const loginResponse = request("/api/auth/login", {
      body: {
        email,
        password: userPassword,
      },
      method: "POST",
    });

    if (loginResponse.status !== 200) {
      fail(`Load-test login failed with status ${loginResponse.status}.`);
    }

    cachedToken = parseJson(loginResponse)?.token;
  } else {
    fail(`Load-test user bootstrap failed with status ${registerResponse.status}.`);
  }

  if (!cachedToken) {
    fail("Load-test user bootstrap did not return a token.");
  }

  return cachedToken;
}

function ensureProductId() {
  if (cachedProductId) {
    return cachedProductId;
  }

  const productResponse = request(`/api/products?sku=${encodeURIComponent(productSku)}&limit=1`);

  if (productResponse.status !== 200) {
    fail(`Load-test product lookup failed with status ${productResponse.status}.`);
  }

  cachedProductId = parseJson(productResponse)?.items?.[0]?.id;

  if (!cachedProductId) {
    fail(`No active load-test product found for SKU ${productSku}.`);
  }

  return cachedProductId;
}

function clearCart(token) {
  const response = request("/api/cart", {
    method: "DELETE",
    token,
  });

  if (response.status !== 200) {
    fail(`Cart reset failed with status ${response.status}.`);
  }
}

function addProductToCart(token, productId) {
  const response = request("/api/cart/items", {
    body: {
      productId,
      quantity: 1,
    },
    method: "POST",
    token,
  });

  if (response.status === 201) {
    return null;
  }

  if (response.status === 400) {
    return response.status;
  }

  fail(`Add-to-cart failed with status ${response.status}.`);
}

export default function () {
  const token = ensureUserToken();
  const productId = ensureProductId();

  clearCart(token);

  const addToCartStatus = addProductToCart(token, productId);
  const terminalStatus =
    addToCartStatus ??
    request("/api/checkout", {
      method: "POST",
      token,
    }).status;

  check({ status: terminalStatus }, {
    "checkout flow returned a terminal status": (result) => [201, 400, 401, 403, 500].includes(result.status),
  });

  sleep(pauseSeconds);
}
