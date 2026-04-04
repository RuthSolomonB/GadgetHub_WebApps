import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductCard from "./ProductCard";

describe("ProductCard", () => {
  it("renders flash sale pricing and product metadata", () => {
    render(
      <MemoryRouter>
        <ProductCard
          product={{
            id: "product-1",
            name: "Atlas Laptop Air",
            image: "/atlas-air.png",
            category: "Computers",
            price: 999,
            effectivePrice: 899,
            hasActiveFlashSale: true,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Flash Sale")).toBeInTheDocument();
    expect(screen.getByText("$899.00")).toBeInTheDocument();
    expect(screen.getByText("$999.00")).toBeInTheDocument();
    expect(screen.getByText("Computers")).toBeInTheDocument();
  });
});
