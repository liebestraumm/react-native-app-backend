import { RequestHandler } from "express";
import * as yup from "yup";
import HttpCode from "../constants/httpCode";
import { HttpError } from "../lib/HttpError";

const validate = (schema: yup.Schema): RequestHandler => {
  return async (request, _, next) => {
    try {
      await schema.validate(
        { ...request.body },
        { strict: true, abortEarly: true }
      );
      next();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const catchedError = new HttpError(
          error.message,
          HttpCode.UNPROCESSABLE_ENTITY
        );
        console.log("Yup validator error: ", error.message);
        return next(catchedError);
      }
      return next(error);
    }
  };
};

export default validate;
