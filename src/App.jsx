import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Footer from "./components/Footer";
import AddProduct from "./components/AddProduct";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Orders from "./pages/Orders";
import FlashSales from "./pages/FlashSales";
import ManagerAccounts from "./pages/ManagerAccounts";

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route
              path="/cart"
              element={
                <ProtectedRoute roles={["customer"]}>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute roles={["customer"]}>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute roles={["product_manager", "super_admin"]}>
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/flash-sales"
              element={
                <ProtectedRoute roles={["product_manager", "super_admin"]}>
                  <FlashSales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/managers"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <ManagerAccounts />
                </ProtectedRoute>
              }
            />
            <Route path="/add" element={<Navigate to="/admin/products" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
