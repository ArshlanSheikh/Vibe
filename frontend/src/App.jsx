import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastProvider } from "./components/common/Toast/ToastContext";
import { AuthProvider } from "./hooks/useAuth";
import Navbar from "./components/common/Navbar/Navbar";
import Sidebar from "./components/common/Sidebar/Sidebar";
import AppRoutes from "./routes/AppRoutes";
import AuthModal from "./components/auth/AuthModal/AuthModal";
import CreatePostModal from "./components/posts/CreatePostModal/CreatePostModal";

function App() {
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState("hot_take");
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handleOpenAuth = (mode = "login") => {
    setAuthModalMode(mode);
  };

  const handleCloseAuth = () => {
    setAuthModalMode(null);
  };

  const handleOpenCreate = (initialType = "hot_take") => {
    setCreateModalInitialType(initialType);
    setCreateModalOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
  };

  const handlePostCreated = () => {
    setFeedRefreshKey((prev) => prev + 1);
  };

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="appLayout">
            <Navbar
              onOpenAuthModal={handleOpenAuth}
              onOpenCreateModal={() => handleOpenCreate("hot_take")}
            />

            <div className="container mainLayoutGrid">
              <Sidebar />
              <main className="contentArea">
                <AppRoutes
                  key={feedRefreshKey}
                  onOpenAuthModal={handleOpenAuth}
                  onOpenCreateModal={handleOpenCreate}
                />
              </main>
            </div>

            <AuthModal
              isOpen={Boolean(authModalMode)}
              initialMode={authModalMode || "login"}
              onClose={handleCloseAuth}
            />

            <CreatePostModal
              isOpen={createModalOpen}
              initialType={createModalInitialType}
              onClose={handleCloseCreate}
              onSuccess={handlePostCreated}
            />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
