import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { encryptMessage, decryptMessage, generateKey } from "../utils/encryptionMessage.js";

/**
 * @route   GET /api/chat
 * @desc    Fetch all chats of logged-in user
 */
export const fetchChats = async (req, res) => {
  try {

    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "username email"
        }
      })
      .sort({ updatedAt: -1 });

    // 🔐 Decrypt latest message
    for (let chat of chats) {

      if (!chat.latestMessage) continue;

      const senderUsername = chat.latestMessage.sender.username;

      const receiver = chat.users.find(
        (u) => u._id.toString() !== chat.latestMessage.sender._id.toString()
      );

      if (!receiver) continue;

      const key = generateKey(senderUsername, receiver.username);

      chat.latestMessage.content = decryptMessage(
        chat.latestMessage.content,
        key
      );

    }

    res.status(200).json(chats);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * @route   POST /api/chat/message
 * @desc    Send a message
 */
export const sendMessage = async (req, res) => {

  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: "Invalid data passed" });
  }

  try {

    const chat = await Chat.findById(chatId).populate("users", "username");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const receiver = chat.users.find(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    const key = generateKey(req.user.username, receiver.username);

    const encryptedContent = encryptMessage(content, key);

    let message = await Message.create({
      sender: req.user._id,
      content: encryptedContent,
      chat: chatId,
      seen: false
    });

    message = await message.populate("sender", "username email");
    message = await message.populate({
      path: "chat",
      populate: {
        path: "users",
        select: "username email"
      }
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id
    });

    // decrypt before sending to frontend
    message.content = decryptMessage(message.content, key);

    res.status(200).json(message);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * @route   GET /api/chat/:chatId
 * @desc    Get all messages of a chat
 */
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chat: req.params.chatId
    })
      .populate("sender", "username email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "username email"
        }
      });

    // Decrypt messages safely
    const decryptedMessages = messages.map((message) => {
      try {
        const sender = message.sender?.username;

        const receiver = message.chat?.users?.find(
          (u) => u._id.toString() !== message.sender._id.toString()
        );

        if (!receiver) return message;

        const key = generateKey(sender, receiver.username);

        return {
          ...message.toObject(),
          content: decryptMessage(message.content, key)
        };
      } catch (err) {
        console.log("Decryption error:", err.message);
        return message;
      }
    });

    res.status(200).json(decryptedMessages);

    
    // Mark unseen messages as seen
    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        seen: false
      },
      {
        $set: { seen: true, seenAt: new Date()}
      }
    );
     const io = req.app.get("io");

    io.to(chatId).emit("messagesSeen", {
      chatId,
      seenBy: req.user._id
    });

  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: error.message });
  }
};


/**
 * @route   POST /api/chat
 * @desc    Access existing chat or create new one
 */
export const accessChat = async (req, res) => {

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId not provided" });
  }

  try {

    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $size: 2 },
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } }
      ]
    })
      .populate("users", "-password")
      .populate("latestMessage");

    if (chat) {
      return res.status(200).json(chat);
    }

    const newChat = await Chat.create({
      isGroupChat: false,
      users: [req.user._id, userId]
    });

    const fullChat = await Chat.findById(newChat._id)
      .populate("users", "-password");

    res.status(200).json(fullChat);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};