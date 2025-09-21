import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Workspace from "./pages/Workspace.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { getToken } from "./services/auth";

function Shell() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// Only allow access if there is a token
function Protected({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

// If already logged in, redirect away from /login
function PublicOnly({ children }) {
  const token = getToken();
  return token ? <Navigate to="/" replace /> : children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          {/* Public login page but bounce if already logged in */}
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />

          {/* Protected app pages */}
          <Route
            path="/"
            element={
              <Protected>
                <Workspace />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
