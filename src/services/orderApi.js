import { apiRequest } from "./apiClient";

export const getOrders = (token) => apiRequest("/orders", { token });
