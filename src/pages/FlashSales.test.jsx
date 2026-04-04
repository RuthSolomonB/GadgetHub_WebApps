import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FlashSales from "./FlashSales";
import { AuthContext } from "../context/authContextValue";
import * as adminApi from "../services/adminApi";
import * as productApi from "../services/productApi";

vi.mock("../services/adminApi", () => ({
  updateFlashSales: vi.fn(),
}));

vi.mock("../services/productApi", () => ({
  getProducts: vi.fn(),
}));

const renderPage = () =>
  render(
    <AuthContext.Provider
      value={{
        token: "manager-token",
        user: { id: "manager-1", role: "product_manager", displayName: "Manager" },
        status: "authenticated",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
      }}
    >
      <FlashSales />
    </AuthContext.Provider>
  );

describe("FlashSales page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productApi.getProducts).mockResolvedValue({
      items: [
        {
          id: "product-1",
          name: "Atlas Laptop Air",
          description: "Portable performance machine",
          category: "Computers",
          price: 999,
          stockQty: 8,
          flashSale: {
            enabled: false,
            salePrice: null,
            discountPercent: null,
            startsAt: null,
            endsAt: null,
            saleStockQty: 0,
          },
        },
      ],
      meta: {
        categories: ["Computers", "Phones"],
        page: 1,
        pages: 1,
        total: 1,
        limit: 20,
      },
    });
    vi.mocked(adminApi.updateFlashSales).mockResolvedValue({
      updatedCount: 1,
      updatedIds: ["product-1"],
    });
  });

  it("submits a batch flash-sale apply request for selected products", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Atlas Laptop Air");

    await user.click(screen.getByLabelText(/select atlas laptop air/i));
    await user.type(screen.getByLabelText(/discount percent/i), "20");
    await user.type(screen.getByLabelText(/starts at/i), "2030-06-01T09:00");
    await user.type(screen.getByLabelText(/ends at/i), "2030-06-01T12:00");
    await user.type(screen.getByLabelText(/sale stock quantity/i), "5");
    await user.click(screen.getByRole("button", { name: /apply flash sale/i }));

    await waitFor(() => {
      expect(adminApi.updateFlashSales).toHaveBeenCalledWith("manager-token", {
        action: "apply",
        productIds: ["product-1"],
        flashSale: {
          discountPercent: "20",
          startsAt: "2030-06-01T09:00",
          endsAt: "2030-06-01T12:00",
          saleStockQty: "5",
        },
      });
    });
  });

  it("can clear flash sales for the selected targets", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Atlas Laptop Air");

    await user.click(screen.getByLabelText(/select atlas laptop air/i));
    await user.click(screen.getByRole("button", { name: /clear flash sale/i }));

    await waitFor(() => {
      expect(adminApi.updateFlashSales).toHaveBeenCalledWith("manager-token", {
        action: "clear",
        productIds: ["product-1"],
      });
    });
  });
});
