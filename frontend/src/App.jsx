import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastProvider } from "./components/common/Toast/ToastContext";
import { AuthProvider } from "./hooks/useAuth";
import Navbar from "./components/common/Navbar/Navbar";
import Sidebar from "./components/common/Sidebar/Sidebar";
import AppRoutes from "./routes/AppRoutes";

function App() {
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleOpenAuth = (mode = "login") => {
    setAuthModalMode(mode);
  };

  const handleCloseAuth = () => {
    setAuthModalMode(null);
  };

  const handleOpenCreate = () => {
    setCreateModalOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
  };

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="appLayout">
            <Navbar
              onOpenAuthModal={handleOpenAuth}
              onOpenCreateModal={handleOpenCreate}
            />

            <div className="container mainLayoutGrid">
              <Sidebar />
              <main className="contentArea">
                <AppRoutes
                  onOpenAuthModal={handleOpenAuth}
                  onOpenCreateModal={handleOpenCreate}
                />
              </main>
            </div>
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
