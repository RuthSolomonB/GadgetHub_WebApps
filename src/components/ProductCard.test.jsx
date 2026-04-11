import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductCard from "./ProductCard";
import { AuthContext } from "../context/authContextValue";
import * as cartApi from "../services/cartApi";

vi.mock("../services/cartApi", () => ({
  addCartItem: vi.fn(),
}));

const baseProduct = {
  id: "product-1",
  name: "Atlas Laptop Air",
  image: "/atlas-air.png",
  category: "Computers",
  price: 999,
  effectivePrice: 899,
  hasActiveFlashSale: true,
  inStock: true,
};

const renderCard = (authValue, props = {}) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProductCard product={baseProduct} {...props} />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pricing, metadata, and both card actions", () => {
    renderCard({
      token: null,
      user: null,
      status: "guest",
      logout: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthenticated: false,
    });

    expect(screen.getByText("Flash Sale")).toBeInTheDocument();
    expect(screen.getByText("$899.00")).toBeInTheDocument();
    expect(screen.getByText("$999.00")).toBeInTheDocument();
    expect(screen.getByText("Computers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to cart/i })).toHaveTextContent("+");
    expect(screen.getByRole("link", { name: /view details/i }).closest(".card-action-row")).toBeInTheDocument();
  });

  it("adds one item to the cart for customers", async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.addCartItem).mockResolvedValue({ items: [] });
    const onAddedToCart = vi.fn();

    renderCard({
      token: "customer-token",
      user: { id: "user-1", role: "customer", displayName: "Customer" },
      status: "authenticated",
      logout: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthenticated: true,
    }, { onAddedToCart });

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    await waitFor(() => {
      expect(cartApi.addCartItem).toHaveBeenCalledWith("customer-token", {
        productId: "product-1",
        quantity: 1,
      });
    });

    expect(onAddedToCart).toHaveBeenCalledWith("product-1");
    expect(screen.getByText("Added to cart.")).toBeInTheDocument();
  });

  it("redirects guests to login when quick add is used", async () => {
    const user = userEvent.setup();

    renderCard({
      token: null,
      user: null,
      status: "guest",
      logout: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthenticated: false,
    });

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows the customer-only notice for non-customer accounts", async () => {
    const user = userEvent.setup();

    renderCard({
      token: "manager-token",
      user: { id: "user-2", role: "product_manager", displayName: "Manager" },
      status: "authenticated",
      logout: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthenticated: true,
    });

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(await screen.findByText(/only customer accounts can use the cart/i)).toBeInTheDocument();
    expect(cartApi.addCartItem).not.toHaveBeenCalled();
  });

  it("shows the cart quantity instead of the add icon when the item is already in the cart", () => {
    renderCard(
      {
        token: "customer-token",
        user: { id: "user-1", role: "customer", displayName: "Customer" },
        status: "authenticated",
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        isAuthenticated: true,
      },
      { cartQuantity: 3 }
    );

    expect(screen.getByRole("button", { name: /in cart: 3/i })).toHaveTextContent("3");
  });
});
