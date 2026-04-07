import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket/socket";

const CreateGroupModal = ({
  onClose,
  token,
  onGroupCreated,
  users = [] // recent users
}) => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  /* ================= LIVE SEARCH ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/users?search=${search}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (Array.isArray(data)) {
          setSearchResults(data);
        } else if (Array.isArray(data.users)) {
          setSearchResults(data.users);
        } else {
          setSearchResults([]);
        }

      } catch (err) {
        console.error(err);
        setSearchResults([]);
      }
    };

    const delay = setTimeout(fetchUsers, 300); // debounce

    return () => clearTimeout(delay);
  }, [search, token]);

  /* ================= ADD USER ================= */
  const addUser = (user) => {
    if (selectedUsers.find((u) => u._id === user._id)) return;
    setSelectedUsers((prev) => [...prev, user]);
  };

  /* ================= REMOVE USER ================= */
  const removeUser = (id) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== id));
  };

  /* ================= CREATE GROUP ================= */
  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      alert("Enter group name & select at least 2 users");
      return;
    }

    try {
      const { data } = await axios.post(
       "http://localhost:5000/api/chat/group",
        {
          name: groupName,
          users: selectedUsers.map((u) => u._id),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      socket.emit("newChat", data);
      onGroupCreated(data);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= WHICH LIST TO SHOW ================= */
  const displayUsers =
    search.trim().length > 0 ? searchResults : users;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-semibold mb-3">Create Group</h2>

        {/* Group Name */}
        <input
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full border p-2 mb-3"
        />

        {/* 🔍 SEARCH INPUT */}
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border p-2 mb-2"
        />

        {/* 👥 USER LIST */}
        <div className="max-h-40 overflow-y-auto border mb-2">
          {Array.isArray(displayUsers) && displayUsers.length > 0 ? (
            displayUsers.map((user) => {
              const isSelected = selectedUsers.some(
                (u) => u._id === user._id
              );

              return (
                <div
                  key={user._id}
                  onClick={() => addUser(user)}
                  className={`p-2 cursor-pointer rounded flex justify-between
                    ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
                >
                  <span>{user.username}</span>
                  {isSelected && <span>✔</span>}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 p-2">
              {search ? "No users found" : "No recent users"}
            </p>
          )}
        </div>

        {/* Selected Users */}
        <div className="flex flex-wrap mb-3">
          {selectedUsers.map((u) => (
            <span
              key={u._id}
              onClick={() => removeUser(u._id)}
              className="bg-blue-200 px-2 m-1 rounded cursor-pointer"
            >
              {u.username} ✕
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={createGroup}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Create
          </button>

          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;