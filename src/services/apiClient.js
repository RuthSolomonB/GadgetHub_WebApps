export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const isFormData = (value) => typeof FormData !== "undefined" && value instanceof FormData;

const normalizePayload = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

export const apiRequest = async (path, { method = "GET", body, token, headers = {} } = {}) => {
  const requestHeaders = new Headers(headers);
  const requestInit = { method, headers: requestHeaders };

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined) {
    if (isFormData(body)) {
      requestInit.body = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestInit.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  const payload = await normalizePayload(response);

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }

  return payload;
};

export const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") {
      return;
    }

    searchParams.set(key, value);
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
};
