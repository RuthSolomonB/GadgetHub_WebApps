import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AddProduct from "./AddProduct";
import { AuthContext } from "../context/authContextValue";
import * as productApi from "../services/productApi";

vi.mock("../services/productApi", () => ({
  createProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getProducts: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
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
      <MemoryRouter>
        <AddProduct />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe("AddProduct admin inventory page", () => {
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
          image: "/atlas-air.png",
          isActive: true,
          flashSale: {
            enabled: true,
            salePrice: 899,
            discountPercent: 10,
            startsAt: "2030-06-01T16:00:00.000Z",
            endsAt: "2030-06-01T18:00:00.000Z",
            saleStockQty: 4,
          },
          effectivePrice: 899,
          flashSaleDiscountPercent: 10,
          hasActiveFlashSale: true,
          updatedAt: "2030-05-01T00:00:00.000Z",
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
  });

  it("loads inventory with admin filters and hides flash-sale form fields", async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenCalledWith(
        {
          includeInactive: true,
          sort: "name_asc",
          search: "",
          category: "all",
          status: "all",
          page: 1,
          limit: 20,
        },
        "manager-token"
      );
    });

    expect(screen.getByRole("heading", { name: /all products/i })).toBeInTheDocument();
    expect(screen.queryByText(/sale price/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Search$/i), "Atlas");

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          includeInactive: true,
          search: "Atlas",
          status: "all",
        }),
        "manager-token"
      );
    });

    await user.selectOptions(screen.getByLabelText(/status/i), "inactive");

    await waitFor(() => {
      expect(productApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          includeInactive: true,
          status: "inactive",
        }),
        "manager-token"
      );
    });
  });

  it("deletes a product from the inventory table", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(productApi.deleteProduct).mockResolvedValue({ deletedId: "product-1" });

    renderPage();

    await screen.findByText("Atlas Laptop Air");
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(productApi.deleteProduct).toHaveBeenCalledWith("manager-token", "product-1");
    });

    confirmSpy.mockRestore();
  });
});
