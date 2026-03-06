import axios from "../api/axios";
import socket from "../socket/socket";


function UserList({ users, onChatSelect, onClearSearch }) {
  const token = localStorage.getItem("token");

  const startChat = async (userId) => {
    try {
      // Call backend to access or create chat
      const { data } = await axios.post(
        "/chat",
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data || !data._id || !data.users) {
        console.error("Invalid chat object returned:", data);
        return;
      }

      onChatSelect(data);
      socket.emit("newChat", data);

      // Clear search after starting chat
      if (onClearSearch) onClearSearch();
    } catch (error) {
      console.error("Start chat error:", error.response?.data || error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Back button */}
      <button
        onClick={onClearSearch}
        className="self-start px-2 py-1 mb-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
      >
        ← Back
      </button>

      {users.map((u) => (
        <div
          key={u._id}
          className="flex justify-between items-center p-2 border rounded hover:bg-gray-100"
        >
          <span>{u.username}</span>
          <button
            onClick={() => startChat(u._id)}
            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Chat
          </button>
        </div>
      ))}
    </div>
  );
}

export default UserList;