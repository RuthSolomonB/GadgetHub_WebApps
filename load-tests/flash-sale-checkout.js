/* global __ENV */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "15s",
};

const runtimeEnv = typeof __ENV === "undefined" ? {} : __ENV;
const baseUrl = runtimeEnv.LOAD_TEST_BASE_URL || "http://localhost:5000";
const authToken = runtimeEnv.LOAD_TEST_TOKEN || "";

export default function () {
  const response = http.post(
    `${baseUrl}/api/checkout`,
    null,
    {
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
    }
  );

  check(response, {
    "checkout returned a terminal status": (res) => [201, 400, 401, 403, 500].includes(res.status),
  });

  sleep(1);
}
