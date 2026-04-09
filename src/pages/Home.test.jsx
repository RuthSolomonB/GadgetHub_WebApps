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

const mainCatalogResponse = {
  items: [
    {
      id: "product-1",
      name: "Nova Phone Core",
      image: "/nova-phone.png",
      category: "Phones",
      price: 499,
      effectivePrice: 499,
      hasActiveFlashSale: false,
      inStock: true,
    },
  ],
  meta: {
    categories: ["Phones"],
    page: 1,
    pages: 1,
  },
};

const flashSaleResponse = {
  items: [
    {
      id: "flash-1",
      name: "Atlas Laptop Air",
      image: "/atlas-air.png",
      category: "Computers",
      price: 999,
      effectivePrice: 799,
      hasActiveFlashSale: true,
      flashSaleDiscountPercent: 20,
      flashSaleEndsAt: "2026-04-09T20:00:00.000Z",
    },
    {
      id: "flash-2",
      name: "Pulse Audio Core",
      image: "/pulse-audio.png",
      category: "Audio",
      price: 249,
      effectivePrice: 199,
      hasActiveFlashSale: true,
      flashSaleDiscountPercent: 20,
      flashSaleEndsAt: "2026-04-09T22:00:00.000Z",
    },
  ],
  meta: {
    categories: ["Audio", "Computers"],
    page: 1,
    pages: 1,
  },
};

const renderHome = () =>
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

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(productApi.getProducts).mockImplementation((params = {}) => {
      if (params.limit) {
        return Promise.resolve(flashSaleResponse);
      }

      return Promise.resolve(mainCatalogResponse);
    });

    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [] });
  });

  it("loads products and renders product cards", async () => {
    renderHome();

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Nova Phone Core")).toBeInTheDocument();
    });

    expect(productApi.getProducts).toHaveBeenCalled();
  });

  it("renders a flash-sale spotlight and requests ending-soon products for it", async () => {
    renderHome();

    expect(await screen.findByText("Atlas Laptop Air")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /see all deals/i })).toBeInTheDocument();

    expect(productApi.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        hasFlashSale: true,
        sort: "ending_soon",
        page: 1,
      })
    );
  });

  it("includes the ending-soon sort option in the main catalog", async () => {
    renderHome();

    expect(await screen.findByText("Nova Phone Core")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ending soon/i })).toBeInTheDocument();
  });

  it("requests flash-sale-only products when the checkbox is enabled", async () => {
    const user = userEvent.setup();

    renderHome();

    await waitFor(() => {
      expect(screen.getByText("Nova Phone Core")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("checkbox", { name: /flash sale only/i }));

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hasFlashSale: true,
          sort: "ending_soon",
          page: 1,
        })
      );
    });
  });

  it("applies the flash-sale filter and scrolls to the catalog when the spotlight CTA is used", async () => {
    const user = userEvent.setup();

    renderHome();

    await user.click(await screen.findByRole("button", { name: /see all deals/i }));

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hasFlashSale: true,
          sort: "ending_soon",
          page: 1,
        })
      );
    });

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: /flash sale only/i })).toBeChecked();
  });

  it("hides the spotlight when there are no active flash-sale products", async () => {
    vi.mocked(productApi.getProducts).mockImplementation((params = {}) => {
      if (params.limit) {
        return Promise.resolve({
          items: [],
          meta: {
            categories: [],
            page: 1,
            pages: 1,
          },
        });
      }

      return Promise.resolve(mainCatalogResponse);
    });

    renderHome();

    expect(await screen.findByText("Nova Phone Core")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /see all deals/i })).not.toBeInTheDocument();
  });

  it("keeps the main catalog visible when the spotlight request fails", async () => {
    vi.mocked(productApi.getProducts).mockImplementation((params = {}) => {
      if (params.limit) {
        return Promise.reject(new Error("Spotlight unavailable"));
      }

      return Promise.resolve(mainCatalogResponse);
    });

    renderHome();

    expect(await screen.findByText("Nova Phone Core")).toBeInTheDocument();
    expect(screen.queryByText("Atlas Laptop Air")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /see all deals/i })).not.toBeInTheDocument();
  });
});
