import { apiRequest } from "./apiClient";

export const getProductManagers = (token) => apiRequest("/admin/product-managers", { token });

export const createProductManager = (token, body) =>
  apiRequest("/admin/product-managers", { method: "POST", token, body });

export const updateProductManager = (token, id, body) =>
  apiRequest(`/admin/product-managers/${id}`, { method: "PATCH", token, body });

export const deleteProductManager = (token, id) =>
  apiRequest(`/admin/product-managers/${id}`, { method: "DELETE", token });

export const updateFlashSales = (token, body) =>
  apiRequest("/admin/flash-sales", { method: "PATCH", token, body });
