import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";


import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { initializeSocket } from "./services/socketService.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";


console.log("MONGO_URI:", process.env.MONGO_URI);
connectDB();

const app = express();
app.use(cors({  
  origin: "https://chat-app-5lx4.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ["https://chat-app-5lx4.vercel.app"] ,
  methods: ["GET", "POST"],
  credentials: true,
  }
});

initializeSocket(io);

server.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
