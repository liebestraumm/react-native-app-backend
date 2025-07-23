import { RequestHandler } from "express";
import UserModel from "../models/User";
import { HttpError } from "../models/HttpError";
import HttpCode from "../constants/httpCode";

export const createNewUser: RequestHandler = async (
  request,
  response,
  next
) => {
  // Read incoming data like: name, email, password
  const { email, password, name } = request.body;
  try {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser)
      throw new HttpError(
        "Unauthorized request, email is already in use!",
        HttpCode.UNAUTHORIZED
      );

    await UserModel.create({ name, email, password });

    // Send message back to check email inbox.
    response.status(201).json({ message: "User created successfully" });
  } catch (error) {
    if (error instanceof HttpError) {
      console.log(error);
      return next(error);
    }
    const unexpectedError = new HttpError(
      `Server unexpected error - ${error}`,
      HttpCode.INTERNAL_SERVER_ERROR
    );
    console.log(unexpectedError);
    return next(unexpectedError);
  }
};
