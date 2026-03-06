import { useEffect, useState, useRef } from "react";
import axios from "../api/axios";
import socket from "../socket/socket";

function ChatBox({ chat, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [otherUsername, setOtherUsername] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem("token");
  const user = currentUser;

  /* =========================
      Fetch Messages
  ==========================*/
  const fetchMessages = async () => {
    if (!chat?._id) return;

    try {
      const { data } = await axios.get(`/chat/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(data);

      // Get other user's username
      const otherMsg = data.find((m) => m.sender?._id !== user._id);
      if (otherMsg) setOtherUsername(otherMsg.sender.username);

    } catch (error) {
      console.error(error);
    }
  };

  /* =========================
      Scroll to bottom
  ==========================*/
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* =========================
      Fetch messages on chat open
  ==========================*/
  useEffect(() => {
    if (!chat?._id) return;

    fetchMessages();
    socket.emit("joinChat", chat._id);
    inputRef.current?.focus();

  }, [chat]);

  /* =========================
      Send Message
  ==========================*/
  const sendMessage = async () => {
    if (!content.trim()) return;

    try {
      const { data } = await axios.post(
        "/chat/message",
        { content, chatId: chat._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("sendMessage", { ...data, chatId: chat._id });
      setMessages((prev) => [...prev, data]);
      setContent("");

    } catch (error) {
      console.error(error);
    }
  };

  /* =========================
      Listen for new messages
  ==========================*/
  useEffect(() => {
    const handleMessage = (newMsg) => {
      if (newMsg.chat._id !== chat._id) return;

      setMessages((prev) =>
        prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]
      );

      if (newMsg.sender?._id !== user._id) {
        setOtherUsername(newMsg.sender.username);
      }
    };

    socket.on("messageReceived", handleMessage);
    return () => socket.off("messageReceived", handleMessage);
  }, [chat, user]);

  /* =========================
      Emit seen for unseen messages from other user
  ==========================*/
  useEffect(() => {
    if (!chat?._id) return;

    const unseenMessages = messages.filter(
      (m) => !m.seen && m.sender?._id !== user._id
    );

    if (unseenMessages.length > 0) {
      socket.emit("messagesSeen", { chatId: chat._id });
    }
  }, [messages, chat, user]);

  /* =========================
      Listen for seen updates
  ==========================*/
  useEffect(() => {
    const handleSeen = ({ chatId }) => {
      if (chatId !== chat._id) return;

      setMessages(prev =>
        prev.map(m =>
          m.sender?._id === user._id ? { ...m, seen: true } : m
        )
      );
    };

    socket.on("messagesSeen", handleSeen);
    return () => socket.off("messagesSeen", handleSeen);
  }, [chat, user]);

  /* =========================
      Scroll when messages or typing updates
  ==========================*/
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  /* =========================
      Typing indicator with debounce
  ==========================*/
  const handleTyping = () => {
    socket.emit("typing", chat._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", chat._id);
    }, 1500);
  };

  useEffect(() => {
    socket.on("typing", () => setIsTyping(true));
    socket.on("stopTyping", () => setIsTyping(false));

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, []);

  return (
    <div className="flex flex-col h-full">

      {/* ================= Header ================= */}
      <div className="flex-shrink-0 flex items-center justify-between border-b p-3 bg-white">
        <button onClick={onClose} className="text-gray-600">← Close</button>
        <h3 className="font-semibold">{otherUsername || "Chat"}</h3>
      </div>

      {/* ================= Messages ================= */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gray-100">
        {messages.map((m) => {
          const isMe = m.sender?._id === user._id;
          return (
            <div key={m._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-md break-words text-sm shadow
                ${isMe ? "bg-blue-400 text-black rounded-br-sm" : "bg-green-400 text-black rounded-bl-sm"}`}>
                {m.content}
              </div>
              {isMe && (
                <span className={`text-xs mt-1 ${m.seen ? "text-green-600" : "text-gray-400"}`}>
                  {m.seen ? "Seen" : "Sent"}
                </span>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white px-3 py-2 rounded-2xl shadow flex gap-1 items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* ================= Input ================= */}
      <div className="flex-shrink-0 border-t p-3 flex gap-2 bg-white">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-500 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;