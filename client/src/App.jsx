import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
//import ChatPage from "./pages/ChatPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Protected Chat Page 
          <Route
            path="/chat/:chatId"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />*/}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;