import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./models/HttpError";
import HttpCode from "./constants/httpCode";
import "./db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";

const app = express();

app.use(express.static("src/public"));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);

// Checks if the route exists. If not, it throws an error
// app.use(() => {
//   const error = new HttpError("Could not find this route", HttpCode.NOT_FOUND);
//   throw error;
// });

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
    app.listen(process.env.PORT ?? 3000, () => {
      console.log(`App running on port ${process.env.PORT ?? 3000}!`);
    });
  } catch (err) {
    console.error("Failed to connect to database. Server not started.", err);
    process.exit(1);
  }
};

startServer();
