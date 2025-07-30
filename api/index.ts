import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./lib/HttpError";
import HttpCode from "./constants/httpCode";
import "./db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import formidable from "formidable";
import path from "path";
import envs from "./env";
const app = express();

app.use(express.static("api/public"));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);

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
