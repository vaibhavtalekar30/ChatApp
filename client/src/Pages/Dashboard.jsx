import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import UserList from "../components/UserList";
import ChatBox from "../components/ChatBox";
import socket from "../socket/socket";
import CreateGroupModal from "../components/CreateGroupModal";
import { useRef } from "react";


const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const selectedChatRef = useRef();

useEffect(() => {
  selectedChatRef.current = selectedChat;
}, [selectedChat]);

  useEffect(() => {

    if (user?._id) {
      socket.emit("setup", user._id);
    }

    socket.on("chatCreated", (chat) => {
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chat._id);
        if (exists) return prev;
        return [chat, ...prev];
      });
    });


    socket.on("messageReceived", (newMessage) => {

      setChats(prevChats => {

        const updatedChats = prevChats.map(chat => {

          const messageChatId =
            newMessage.chat?._id || newMessage.chatId;

          if (chat._id !== messageChatId) return chat;

      const isChatOpen = selectedChatRef.current?._id === chat._id;

          const senderId =
            typeof newMessage.sender === "object"
              ? newMessage.sender._id
              : newMessage.sender;

          const isMe = senderId === user._id;

          let seenStatus = newMessage.seen;

          // If OTHER user sent message
          if (!isMe) {
            seenStatus = isChatOpen ? true : false;
          }

          return {
            ...chat,
            latestMessage: {
              ...newMessage,
              seen: seenStatus
            }
          };

        });

        // Move chat to top
        const messageChatId =
          newMessage.chat?._id || newMessage.chatId;

        const index = updatedChats.findIndex(
          c => c._id === messageChatId
        );

        if (index !== -1) {
          const chat = updatedChats.splice(index, 1)[0];
          updatedChats.unshift(chat);
        }

        return updatedChats;

      });

    });
    socket.on("messagesSeen", ({ chatId }) => {

      setChats(prev =>
        prev.map(chat => {

          if (chat._id === chatId && chat.latestMessage) {
            return {
              ...chat,
              latestMessage: {
                ...chat.latestMessage,
                seen: true
              }
            };
          }

          return chat;
        })
      );

    });

    return () => {
      socket.off("chatCreated");
      socket.off("messageReceived");
    };

  }, [user]);

  const getChatUsers = () => {
    const allUsers = [];

    chats.forEach(chat => {
      chat.users.forEach(u => {
        if (u._id !== user._id) {
          allUsers.push(u);
        }
      });
    });

    // remove duplicates
    return Array.from(
      new Map(allUsers.map(u => [u._id, u])).values()
    );
  };


  const fetchChats = useCallback(async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/chat", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(data);
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  useEffect(() => { if (token) fetchChats(); }, [token, fetchChats]);
  useEffect(() => { fetchChats(); }, [fetchChats]);

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults([]); return; }
    try {
      const { data } = await axios.get(`http://localhost:5000/api/users?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(data);
    } catch (error) { console.error(error); }
  };


  useEffect(() => {

    const handleSeenUpdate = ({ chatId }) => {

      setChats(prev =>
        prev.map(chat => {

          if (chat._id !== chatId) return chat;

          if (!chat.latestMessage) return chat;

          return {
            ...chat,
            latestMessage: {
              ...chat.latestMessage,
              seen: true
            }
          };

        })
      );

    };

    socket.on("messagesSeen", handleSeenUpdate);

    return () => {
      socket.off("messagesSeen", handleSeenUpdate);
    };

  }, []);


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Navbar */}
      <Navbar />
      {showGroupModal && (
        <CreateGroupModal
          token={token}
          users={getChatUsers()}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={(group) => {
            setChats(prev => [group, ...prev]);
          }}
        />
      )}
      <div className="flex flex-1 h-full">
        {/* Sidebar */}

        <div className="flex flex-col w-1/3 min-w-0 border-r border-gray-300 p-3 overflow-hidden">

          {/* Search */}

          <div className="flex gap-2 mb-4 w-full min-w-0">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
            />
            <button
              onClick={handleSearch}
              className="px-2 py-2 bg-white-500 text-white rounded flex-shrink-0"
            >
              🔍
            </button>
          </div>
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-4 overflow-y-auto max-h-64 w-full">
              <h4 className="font-semibold mb-2">Search Results</h4>
              <UserList
                users={searchResults}
                onChatSelect={(chat) => {
                  setSelectedChat(chat);

                  // Add new chat to recent chats if not already present
                  setChats((prev) => {
                    const exists = prev.find((c) => c._id === chat._id);
                    if (exists) return prev;
                    return [chat, ...prev]; // add on top
                  });
                }}
                onClearSearch={() => {
                  setSearchResults([]);
                  setSearch("");
                }}
              />
            </div>
          )}


          <div className="flex-1 overflow-y-auto">

            <button
              onClick={() => setShowGroupModal(true)}
              className="mb-3 p-2 bg-blue-500 text-white rounded"
            >
              + Create Group
            </button>
            <h3 className="font-semibold mb-2 px-3">Recent Chats</h3>

            {chats.length === 0 && (
              <p className="text-gray-500 text-sm px-3">No chats yet</p>
            )}

            {chats.map((chat) => {
              const otherUser = chat.users.find((u) => u._id !== user._id);
              const chatName = chat.isGroupChat
                ? chat.chatName
                : otherUser?.username;
              const isSelected = selectedChat?._id === chat._id;

              const latest = chat.latestMessage;

              const senderId =
                typeof latest?.sender === "object"
                  ? latest?.sender?._id
                  : latest?.sender;

              const isMe = senderId === user._id;
              const isSeen = latest?.seen;

              return (
                <div
                  key={chat._id}
                  onClick={() => {

                    setSelectedChat(chat);

                    setChats(prev =>
                      prev.map(c => {

                        if (c._id !== chat._id) return c;

                        if (!c.latestMessage) return c;

                        return {
                          ...c,
                          latestMessage: {
                            ...c.latestMessage,
                            seen: true
                          }
                        };

                      })
                    );

                  }}
                  className={`px-3 py-2 cursor-pointer border-b flex flex-col transition
        ${isSelected ? "bg-gray-200" : "hover:bg-gray-100"}`}
                >

                  {/* Username */}
                  <strong className="text-sm text-gray-800">
                    {chatName}
                  </strong>

                  {/* Message Row */}
                  <div className="flex items-center justify-between mt-1">

                    {/* Message Preview */}
                    <p
                      className={`text-sm truncate max-w-[75%]
            ${!isMe && !isSeen
                          ? "font-semibold text-black"
                          : "text-gray-500"
                        }`}
                    >
                      {latest?.content || "No messages yet"}
                    </p>

                    {/* Indicators */}
                    <div className="flex items-center ml-2">

                      {/* Unread message from OTHER USER */}
                      {!isMe && !isSeen && (
                        <span className="w-2 h-2 bg-black rounded-full"></span>
                      )}

                      {/* MY MESSAGE STATUS */}
                      {isMe && (
                        <span
                          className={`w-2 h-2 rounded-full border
                ${isSeen
                              ? "bg-green-500 border-green-500"
                              : "bg-white border-gray-500"
                            }`}
                        />
                      )}

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChat ? (
            <ChatBox
              chat={selectedChat}
              currentUser={user}
              onClose={() => setSelectedChat(null)}
            />
          ) : (

            <h3 className="flex-1 flex items-center justify-center">Select a chat to start messaging</h3>

          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;