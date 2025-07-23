import { Request, Response } from "express";
import HttpCode from "../constants/httpCode";
import { HttpError } from "../models/HttpError";

export const initAction = async (_: Request, response: Response) => {
  // throw new HttpError("Custom Error!", HttpCode.NOT_FOUND);
  return response.status(HttpCode.OK).json({message: "OK!"})
};

export const sendData = async (request: Request, response: Response) => {
  const {name, email} = request.body
  response.status(HttpCode.CREATED).json({message: "Created!", data: {name, email}})
};
