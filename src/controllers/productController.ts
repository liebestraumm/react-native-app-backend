import { RequestHandler } from "express";
import HttpCode from "../constants/httpCode";

export const initAction: RequestHandler = async (_, response) => {
  // throw new HttpError("Custom Error!", HttpCode.NOT_FOUND);
  return response.status(HttpCode.OK).json({message: "OK!"})
};

export const sendData: RequestHandler = async (request, response) => {
  const {name, email} = request.body
  response.status(HttpCode.CREATED).json({message: "Created!", data: {name, email}})
};
