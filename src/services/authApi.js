import { apiRequest } from "./apiClient";

export const registerUser = (details) => apiRequest("/auth/register", { method: "POST", body: details });

export const loginUser = (credentials) => apiRequest("/auth/login", { method: "POST", body: credentials });

export const getCurrentUser = (token) => apiRequest("/auth/me", { token });
