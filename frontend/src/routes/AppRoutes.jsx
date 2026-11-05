import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";

const AppRoutes = ({ onOpenAuthModal, onOpenCreateModal }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            onOpenAuthModal={onOpenAuthModal}
            onOpenCreateModal={onOpenCreateModal}
          />
        }
      />
      <Route
        path="*"
        element={
          <Home
            onOpenAuthModal={onOpenAuthModal}
            onOpenCreateModal={onOpenCreateModal}
          />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
