import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const Navbar = () => {
  const { user, logout, status } = useAuth();

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link className="brand" to="/">
          GadgetHub
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {user?.role === "customer" && <Link to="/cart">Cart</Link>}
          {user?.role === "customer" && <Link to="/orders">Orders</Link>}
          {user && ["product_manager", "super_admin"].includes(user.role) && (
            <>
              <Link to="/admin/products">Manage Products</Link>
              <Link to="/admin/flash-sales">Flash Sales</Link>
            </>
          )}
          {user?.role === "super_admin" && <Link to="/admin/managers">Managers</Link>}
          {!user && status !== "loading" && <Link to="/login">Login</Link>}
          {!user && status !== "loading" && <Link to="/register">Register</Link>}
          {user && (
            <>
              <span className="nav-user">{user.displayName}</span>
              <button className="nav-logout" onClick={logout} type="button">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
