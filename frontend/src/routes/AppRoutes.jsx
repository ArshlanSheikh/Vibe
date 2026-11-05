import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home/Home";
import ProfileSettings from "../pages/ProfileSettings/ProfileSettings";
import PostView from "../pages/PostView/PostView";
import Search from "../pages/Search/Search";
import { useAuth } from "../hooks/useAuth";

const AppRoutes = ({ onOpenAuthModal, onOpenCreateModal }) => {
  const { isLoggedIn, loading } = useAuth();

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
        path="/post/:id"
        element={<PostView onOpenAuthModal={onOpenAuthModal} />}
      />
      <Route
        path="/search"
        element={<Search onOpenAuthModal={onOpenAuthModal} />}
      />
      <Route
        path="/settings"
        element={
          isLoggedIn ? (
            <ProfileSettings />
          ) : loading ? (
            <div>Loading...</div>
          ) : (
            <Navigate to="/" replace />
          )
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
