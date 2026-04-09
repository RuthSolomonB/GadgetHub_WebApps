import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";
import { AuthContext } from "../context/authContextValue";
import * as cartApi from "../services/cartApi";
import * as productApi from "../services/productApi";

vi.mock("../services/productApi", () => ({
  getProducts: vi.fn(),
}));

vi.mock("../services/cartApi", () => ({
  getCart: vi.fn(),
}));

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(productApi.getProducts).mockResolvedValue({
      items: [
        {
          id: "product-1",
          name: "Nova Phone Core",
          image: "/nova-phone.png",
          category: "Phones",
          price: 499,
          effectivePrice: 499,
          hasActiveFlashSale: false,
        },
      ],
      meta: {
        categories: ["Phones"],
        page: 1,
        pages: 1,
      },
    });
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [] });
  });

  it("loads products and renders product cards", async () => {
    render(
      <AuthContext.Provider
        value={{
          token: null,
          user: null,
          status: "guest",
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          isAuthenticated: false,
        }}
      >
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Nova Phone Core")).toBeInTheDocument();
    });

    expect(productApi.getProducts).toHaveBeenCalled();
  });

  it("requests flash-sale-only products when the checkbox is enabled", async () => {
    const user = userEvent.setup();

    render(
      <AuthContext.Provider
        value={{
          token: null,
          user: null,
          status: "guest",
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          isAuthenticated: false,
        }}
      >
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("checkbox", { name: /flash sale only/i }));

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hasFlashSale: true,
          page: 1,
        })
      );
    });
  });
});
