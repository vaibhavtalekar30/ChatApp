import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  accessChat,
  fetchChats,
  sendMessage,
  getMessages,
  createGroupChat
} from "../controllers/chatController.js";

const router = express.Router();


router.post("/", protect, accessChat);
router.get("/", protect, fetchChats);
router.get("/:chatId", protect, getMessages);
router.post("/message", protect, sendMessage);
router.post("/group", protect, createGroupChat);

export default router;