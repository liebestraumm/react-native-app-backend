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
  if (!socketReq?.token) {
    return next(new Error("Unauthorized request!"));
  }

  try {
    socket.data.jwtDecode = verify(socketReq.token, envs.JWT_SECRET!);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new Error("jwt expired"));
    }

    return next(new Error("Invalid token!"));
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
  const socketData = socket.data as { jwtDecode: { id: string } };
  const userId = socketData.jwtDecode.id;

  socket.join(userId);

  // console.log("user is connected");
  socket.on("chat:new", async (data: IncomingMessage) => {
    const { conversationId, to, message } = data;

    // Create a new chat message using Sequelize
    await Chat.create({
      conversationId,
      sentBy: message.user.id,
      content: message.text,
      timestamp: new Date(message.time),
      viewed: false,
    });

    const messageResponse: OutgoingMessageResponse = {
      from: message.user,
      conversationId,
      message: { ...message, viewed: false },
    };

    socket.to(to).emit("chat:message", messageResponse);
  });

  socket.on(
    "chat:seen",
    async ({ conversationId, messageId, peerId }: SeenData) => {
      await updateSeenStatus(peerId, conversationId);
      socket.to(peerId).emit("chat:seen", { conversationId, messageId });
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
    app.listen(envs.PORT ?? 8000, () => {
      console.log(`App running on port ${envs.PORT ?? 8000}!`);
    });
  } catch (err) {
    console.error("Failed to connect to database. Server not started.", err);
    process.exit(1);
  }
};

startServer();
