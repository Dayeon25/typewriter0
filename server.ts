import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      io.to(roomId).emit("user-joined", { userId: socket.id, count: io.sockets.adapter.rooms.get(roomId)?.size });
    });

    socket.on("send-key", ({ roomId, key }) => {
      // Broadcast the key to everyone in the room except the sender
      socket.to(roomId).emit("receive-key", key);
    });

    socket.on("mouse-move", ({ roomId, dx, dy }) => {
      socket.to(roomId).emit("receive-mouse-move", { dx, dy });
    });

    socket.on("mouse-click", ({ roomId, button }) => {
      socket.to(roomId).emit("receive-mouse-click", { button });
    });

    socket.on("mouse-scroll", ({ roomId, dy }) => {
      socket.to(roomId).emit("receive-mouse-scroll", { dy });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
