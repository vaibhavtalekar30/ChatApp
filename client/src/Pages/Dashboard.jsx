import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import UserList from "../components/UserList";
import ChatBox from "../components/ChatBox";
import socket from "../socket/socket";


const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  
  
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

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

    // NEW: update latest message
    /* socket.on("messageReceived", (newMessage) => {
 
       setChats(prevChats => {
 
         const updated = prevChats.map(chat => {
 
           if (chat._id === newMessage.chatId) {
             return {
               ...chat,
               latestMessage: newMessage
             };
           }
 
           return chat;
         });
 
         const index = updated.findIndex(c => c._id === newMessage.chatId);
 
         if (index !== -1) {
           const chat = updated.splice(index, 1)[0];
           updated.unshift(chat);
         }
 
         return updated;
       });
 
     }); */

    socket.on("messageReceived", (newMessage) => {

      setChats(prevChats => {

        const updatedChats = prevChats.map(chat => {

          if (chat._id !== newMessage.chatId) return chat;

          const isChatOpen = selectedChat?._id === chat._id;

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
        const index = updatedChats.findIndex(c => c._id === newMessage.chatId);

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

  }, [user, selectedChat]);




  const fetchChats = useCallback(async () => {
    try {
      const { data } = await axios.get("http://192.168.0.100:5000/api/chat", {
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
      const { data } = await axios.get(`http://192.168.0.100:5000/api/users?search=${search}`, {
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

          {/* Recent Chats */}
          { /* <div className="flex-1 overflow-y-auto">
            <h3 className="font-semibold mb-2">Recent Chats</h3>
            {chats.length === 0 && <p>No chats yet</p>}

            {chats.map((chat) => {
              const otherUser = chat.users.find((u) => u._id !== user._id);
              const isSelected = selectedChat?._id === chat._id;
              return (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-2 cursor-pointer border-b rounded ${isSelected ? "bg-gray-200" : "hover:bg-gray-100"
                    }`}
                >
                  <strong>{otherUser?.username}</strong>
                  <div className="flex items-center justify-between">

                    <p
                      className={`text-sm truncate ${chat.latestMessage &&
                          chat.latestMessage.sender !== user._id &&
                          !chat.latestMessage.seen
                          ? "font-bold text-black"
                          : "text-gray-500"
                        }`}
                    >
                      {chat.latestMessage?.content || "No messages yet"}
                    </p>

                    {chat.latestMessage?.sender === user._id && (
                      <span
                        className={`w-2 h-2 rounded-full border ml-2 ${chat.latestMessage.seen
                            ? "bg-green-500 border-green-500"
                            : "border-gray-500"
                          }`}
                      />
                    )}

                  </div>
                </div>
              );
            })}
          </div>*/}

          <div className="flex-1 overflow-y-auto">
            <h3 className="font-semibold mb-2 px-3">Recent Chats</h3>

            {chats.length === 0 && (
              <p className="text-gray-500 text-sm px-3">No chats yet</p>
            )}

            {chats.map((chat) => {
              const otherUser = chat.users.find((u) => u._id !== user._id);
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
                    {otherUser?.username}
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