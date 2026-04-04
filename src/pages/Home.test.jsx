import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";
import * as productApi from "../services/productApi";

vi.mock("../services/productApi", () => ({
  getProducts: vi.fn(),
}));

describe("Home page", () => {
  beforeEach(() => {
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
  });

  it("loads products and renders product cards", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Nova Phone Core")).toBeInTheDocument();
    });

    expect(productApi.getProducts).toHaveBeenCalled();
  });
});
