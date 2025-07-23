import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./models/HttpError";
import HttpCode from "./constants/httpCode";
import productRoute from "./routes/productRoute";
import appRoute from "./routes/authRoute";

const app = express();
app.use(express.json());

// Routes
app.use("/auth", appRoute);
app.use("/product", productRoute);

// Checks if the route exists. If not, it throws an error
app.use(() => {
  const error = new HttpError("Could not find this route", HttpCode.NOT_FOUND);
  throw error;
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

app.listen(3000, () => {
  console.log("App running on port 3000!");
});
