const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const readResponse = async (response) => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data;
};

export const getProducts = async () => {
  const response = await fetch(`${API_BASE_URL}/products`);
  return readResponse(response);
};

export const getProductById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`);
  return readResponse(response);
};
