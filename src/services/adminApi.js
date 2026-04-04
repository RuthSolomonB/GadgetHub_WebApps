import { apiRequest } from "./apiClient";

export const getProductManagers = (token) => apiRequest("/admin/product-managers", { token });

export const createProductManager = (token, body) =>
  apiRequest("/admin/product-managers", { method: "POST", token, body });

export const updateProductManager = (token, id, body) =>
  apiRequest(`/admin/product-managers/${id}`, { method: "PATCH", token, body });
