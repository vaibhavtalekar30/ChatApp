export const initializeSocket = (io) => {
  io.on("connection", (socket) => {

    socket.on("setup", (userId) => {
      socket.join(userId); // each user gets their own room
    });

    socket.on("joinChat", (room) => {
      socket.join(room);
    });

    socket.on("sendMessage", (data) => {
      io.to(data.chatId).emit("messageReceived", data);
    });

    socket.on("newChat", (data) => {
      data.users.forEach((user) => {
        io.to(user._id).emit("chatCreated", data);
      });
    });

    socket.on("messagesSeen", ({ chatId }) => {
      socket.to(chatId).emit("messagesSeen", {
        chatId
      });
    });

    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing");
    });

    socket.on("stopTyping", (chatId) => {
      socket.to(chatId).emit("stopTyping");
    });

  });
};