import { apiRequest, buildQueryString } from "./apiClient";

export const getProducts = (params = {}, token) =>
  apiRequest(`/products${buildQueryString(params)}`, { token });

export const getProductById = (id) => apiRequest(`/products/${id}`);

export const createProduct = (token, body) =>
  apiRequest("/products", { method: "POST", token, body });

export const updateProduct = (token, id, body) =>
  apiRequest(`/products/${id}`, { method: "PATCH", token, body });

export const deleteProduct = (token, id) =>
  apiRequest(`/products/${id}`, { method: "DELETE", token });

export const uploadProductImage = (token, file) => {
  const body = new FormData();
  body.append("image", file);

  return apiRequest("/upload", { method: "POST", token, body });
};
