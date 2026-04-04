import { apiRequest } from "./apiClient";

export const getCart = (token) => apiRequest("/cart", { token });

export const addCartItem = (token, body) => apiRequest("/cart/items", { method: "POST", token, body });

export const updateCartItem = (token, productId, quantity) =>
  apiRequest(`/cart/items/${productId}`, { method: "PATCH", token, body: { quantity } });

export const removeCartItem = (token, productId) =>
  apiRequest(`/cart/items/${productId}`, { method: "DELETE", token });

export const clearCart = (token) => apiRequest("/cart", { method: "DELETE", token });

export const checkoutCart = (token) => apiRequest("/checkout", { method: "POST", token });
