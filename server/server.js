import "./config/env.js";

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


connectDB();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL }
});

initializeSocket(io);

server.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);