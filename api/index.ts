import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./lib/HttpError";
import HttpCode from "./constants/httpCode";
import "./db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import formidable from "formidable";
import path from "path";
import envs from "./env";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { Conversation, Chat } from "./models/Conversation";
import User from "./models/User";
import { sequelize } from "./db";
import conversationRouter from "./routes/conversation";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket-message",
});
app.use(morgan("dev"));
app.use(express.static("api/public"));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api/conversation", conversationRouter);

// SOCKET IO
io.use((socket, next) => {
  const socketReq = socket.handshake.auth as { token: string } | undefined;
  
  // If no token provided, allow connection but mark as unauthenticated
  if (!socketReq?.token) {
    socket.data.authenticated = false;
    return next();
  }

  try {
    socket.data.jwtDecode = verify(socketReq.token, envs.JWT_SECRET!);
    socket.data.authenticated = true;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      socket.data.authenticated = false;
      socket.data.authError = "jwt expired";
    } else {
      socket.data.authenticated = false;
      socket.data.authError = "Invalid token!";
    }
  }

  next();
});

type MessageProfile = {
  id: string;
  name: string;
  avatar?: string;
};

type IncomingMessage = {
  message: {
    id: string;
    time: string;
    text: string;
    user: MessageProfile;
  };
  to: string;
  conversationId: string;
};

type OutgoingMessageResponse = {
  message: {
    id: string;
    time: string;
    text: string;
    user: MessageProfile;
    viewed: boolean;
  };
  from: MessageProfile;
  conversationId: string;
};

type SeenData = {
  messageId: string;
  peerId: string;
  conversationId: string;
};

// Function to update seen status of messages
const updateSeenStatus = async (peerId: string, conversationId: string) => {
  try {
    // Update all unviewed messages in the conversation that were sent by the peer
    await Chat.update(
      { viewed: true },
      {
        where: {
          conversationId,
          sentBy: peerId,
          viewed: false,
        },
      }
    );
  } catch (error) {
    console.error("Error updating seen status:", error);
  }
};

io.on("connection", (socket) => {
  const socketData = socket.data as { 
    jwtDecode?: { id: string }; 
    authenticated: boolean; 
    authError?: string;
  };

  // Handle unauthenticated connections
  if (!socketData.authenticated) {
    if (socketData.authError) {
      socket.emit("auth:error", { message: socketData.authError });
    }
    // Allow connection but don't join any rooms or handle authenticated events
    return;
  }

  const userId = socketData.jwtDecode!.id;
  socket.join(userId);
  console.log(`User ${userId} joined their room`);

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
    // Socket.IO automatically handles cleanup on disconnect
  });

  // Handle connection status
  socket.on("chat:status", async () => {
    const allSockets = await io.fetchSockets();
    const onlineUsers = allSockets.map(s => s.data.jwtDecode?.id).filter(Boolean);
    console.log(`Online users: ${onlineUsers.join(', ')}`);
    socket.emit("chat:status", { onlineUsers });
  });

  // console.log("user is connected");
  socket.on("chat:new", async (data: IncomingMessage) => {
    const { conversationId, to, message } = data;
    
    console.log(`Received chat message from ${message.user.id} to ${to} in conversation ${conversationId}`);
    console.log(`Message content: ${message.text}`);

    // Use database transaction for data consistency
    const transaction = await sequelize.transaction();
    
    try {
      // Validate conversation exists and user is participant
      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          {
            model: User,
            as: 'participants',
            where: { id: message.user.id }
          }
        ],
        transaction
      });

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found or user ${message.user.id} is not a participant`);
      }

      // Create a new chat message using Sequelize with transaction
      const newChat = await Chat.create({
        conversationId,
        sentBy: message.user.id,
        content: message.text,
        timestamp: new Date(message.time),
        viewed: false,
      }, { transaction });

      console.log(`Chat message saved to database with ID: ${newChat.id}`);

      // Commit the transaction
      await transaction.commit();

      const messageResponse: OutgoingMessageResponse = {
        from: message.user,
        conversationId,
        message: { ...message, id: newChat.id, viewed: false },
      };

      // Emit to sender for confirmation
      socket.emit("chat:message", messageResponse);
      console.log(`Message confirmation sent to sender ${message.user.id}`);
      
      // Check if recipient is online and emit message
      const recipientSockets = await io.in(to).fetchSockets();
      if (recipientSockets.length > 0) {
        socket.to(to).emit("chat:message", messageResponse);
        console.log(`Message sent to recipient ${to} (online)`);
      } else {
        console.log(`Recipient ${to} is offline, message saved to database`);
      }
      
      // Verify message was saved by querying it back
      const savedMessage = await Chat.findByPk(newChat.id);
      if (savedMessage) {
        console.log(`Message verified in database: ${savedMessage.content}`);
      } else {
        console.error(`Message not found in database after saving: ${newChat.id}`);
      }

    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error("Error sending chat message:", error);
      socket.emit("chat:error", { 
        message: "Failed to send message", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  socket.on(
    "chat:seen",
    async ({ conversationId, messageId, peerId }: SeenData) => {
      try {
        await updateSeenStatus(peerId, conversationId);
        socket.to(peerId).emit("chat:seen", { conversationId, messageId });
        console.log(`Marked messages as seen in conversation ${conversationId} by user ${userId}`);
      } catch (error) {
        console.error("Error updating seen status:", error);
        socket.emit("chat:error", { message: "Failed to update seen status" });
      }
    }
  );

  socket.on("chat:typing", (typingData: { to: string; active: boolean }) => {
    socket.to(typingData.to).emit("chat:typing", { typing: typingData.active });
  });
});


// Checks if the route exists. If not, it throws an error
app.use(() => {
  const error = new HttpError("Could not find this route", HttpCode.NOT_FOUND);
  throw error;
});

// Upload file functionality
app.post("/upload-file", async (req, res) => {
  const form = formidable({
    uploadDir: path.join(__dirname, "public"),
    filename(name, ext, part, form) {
      return Date.now() + "_" + part.originalFilename;
    },
  });
  await form.parse(req);

  res.send("ok");
});

// NodeJS internal middleware that triggers when a HttpError object is thrown
app.use(
  (error: HttpError, _: Request, response: Response, next: NextFunction) => {
    if (response.headersSent) {
      return next(error);
    }
    response.status(error.code || HttpCode.INTERNAL_SERVER_ERROR);
    response.json({ message: error.message || "An unknown error occurred!" });
  }
);

const startServer = async () => {
  try {
    server.listen(envs.PORT ?? 8000, () => {
      console.log(`App running on port ${envs.PORT ?? 8000}!`);
    });
  } catch (err) {
    console.error("Failed to connect to database. Server not started.", err);
    process.exit(1);
  }
};

startServer();
