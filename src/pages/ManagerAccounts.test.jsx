import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerAccounts from "./ManagerAccounts";
import { AuthContext } from "../context/authContextValue";
import * as adminApi from "../services/adminApi";

vi.mock("../services/adminApi", () => ({
  createProductManager: vi.fn(),
  deleteProductManager: vi.fn(),
  getProductManagers: vi.fn(),
  updateProductManager: vi.fn(),
}));

const renderPage = () =>
  render(
    <AuthContext.Provider
      value={{
        token: "super-admin-token",
        user: { id: "super-admin-1", role: "super_admin", displayName: "Super Admin" },
        status: "authenticated",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
      }}
    >
      <ManagerAccounts />
    </AuthContext.Provider>
  );

describe("ManagerAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getProductManagers).mockResolvedValue({
      items: [
        {
          id: "manager-1",
          email: "manager@example.com",
          displayName: "Manager User",
          role: "product_manager",
          isActive: true,
        },
      ],
    });
  });

  it("deletes manager accounts from the list", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(adminApi.deleteProductManager).mockResolvedValue({ deletedId: "manager-1" });

    renderPage();

    await screen.findByText("Manager User");
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(adminApi.deleteProductManager).toHaveBeenCalledWith("super-admin-token", "manager-1");
    });

    confirmSpy.mockRestore();
  });
});
