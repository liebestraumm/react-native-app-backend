import { RequestHandler } from "express";
import HttpCode from "../constants/httpCode";

export const createNewUser: RequestHandler = (request, response, next) => {
  const {email, password, name} = request.body
  return response.status(HttpCode.CREATED).json({ message: "hello" });
};
