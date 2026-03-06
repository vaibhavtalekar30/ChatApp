import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-gray-900 text-white shadow-md">
      {/* Logo / App name */}
      <h3
        className="text-lg font-bold cursor-pointer hover:text-gray-300"
        onClick={() => navigate("/dashboard")}
      >
        ChatApp
      </h3>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {user ? `${user.username}` : "Loading..."}
        </span>

        {user && (
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors duration-200"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;