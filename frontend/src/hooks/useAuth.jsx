import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("vibe_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("vibe_access_token") || null);
  const [loading, setLoading] = useState(true);

  // Sync user state and fetch latest anonymous profile
  const fetchCurrentUser = useCallback(async () => {
    const accessToken = localStorage.getItem("vibe_access_token");
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/users/me");
      if (response?.success && response?.data) {
        setUser(response.data);
        localStorage.setItem("vibe_user", JSON.stringify(response.data));
      }
    } catch (err) {
      console.warn("Could not fetch current session user:", err.message);
      // If 401, interceptor will attempt refresh or clean up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("vibe_auth_expired", handleAuthExpired);
    return () => window.removeEventListener("vibe_auth_expired", handleAuthExpired);
  }, [fetchCurrentUser]);

  // Auth Operations
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res?.success && res?.data) {
      const { accessToken, refreshToken, user: userData } = res.data;
      localStorage.setItem("vibe_access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("vibe_refresh_token", refreshToken);
      }
      localStorage.setItem("vibe_user", JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      return res.data;
    }
    throw new Error(res?.message || "Login failed");
  };

  const register = async (email, password, interests = []) => {
    const res = await api.post("/auth/register", { email, password, interests });
    if (res?.success && res?.data) {
      const { accessToken, refreshToken, user: userData } = res.data;
      localStorage.setItem("vibe_access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("vibe_refresh_token", refreshToken);
      }
      localStorage.setItem("vibe_user", JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      return res.data;
    }
    throw new Error(res?.message || "Registration failed");
  };

  const logout = async () => {
    try {
      const storedRefreshToken = localStorage.getItem("vibe_refresh_token");
      await api.post("/auth/logout", { refreshToken: storedRefreshToken });
    } catch (err) {
      console.warn("Logout request failed:", err.message);
    } finally {
      localStorage.removeItem("vibe_access_token");
      localStorage.removeItem("vibe_refresh_token");
      localStorage.removeItem("vibe_user");
      setUser(null);
      setToken(null);
    }
  };

  const updateProfile = async (updates) => {
    const res = await api.patch("/users/profile", updates);
    if (res?.success && res?.data) {
      setUser((prev) => ({ ...prev, ...res.data }));
      localStorage.setItem("vibe_user", JSON.stringify({ ...user, ...res.data }));
      return res.data;
    }
    throw new Error(res?.message || "Failed to update profile");
  };

  const regenerateUsername = async () => {
    const res = await api.post("/users/regenerate-username");
    if (res?.success && res?.data) {
      setUser((prev) => ({ ...prev, anonymousUsername: res.data.anonymousUsername }));
      localStorage.setItem(
        "vibe_user",
        JSON.stringify({ ...user, anonymousUsername: res.data.anonymousUsername })
      );
      return res.data;
    }
    throw new Error(res?.message || "Failed to regenerate username");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
        updateProfile,
        regenerateUsername,
        refreshProfile: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
