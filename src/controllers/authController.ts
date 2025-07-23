import { RequestHandler } from "express";
import { getDb } from "../db";
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
    const db = getDb();
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ email });
    // Send error if yes otherwise create new account and save user inside DB.
    if (existingUser)
      throw new HttpError(
        "Unauthorized request, email is already in use!",
        HttpCode.UNAUTHORIZED
      );

    await usersCollection.insertOne({ name, email, password });

    // Send message back to check email inbox.
    response.status(201).json({ message: "Please check your inbox." });
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
