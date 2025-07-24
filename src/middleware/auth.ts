import { RequestHandler } from "express";
import { HttpError } from "../models/HttpError";
import HttpCode from "../constants/httpCode";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import UserModel from "../models/User";
import { IUserProfile } from "../interfaces/IUserProfile";

declare global {
  namespace Express {
    interface Request {
      user: IUserProfile;
    }
  }
}

export const isAuth: RequestHandler = async (request, response, next) => {
  try {
    const authToken = request.headers.authorization;
    if (!authToken)
      throw new HttpError("Unauthorized request", HttpCode.FORBIDDEN);
    const token = authToken.split("Bearer ")[1];
    const payload = jwt.verify(token, "secret") as { id: string };

    const user = await UserModel.findById(payload.id);
    if (!user) throw new HttpError("Unauthorized request", HttpCode.FORBIDDEN);

    request.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.verified,
    };
    next();
  } catch (error) {
    let authError: HttpError | undefined;
    if (error instanceof TokenExpiredError) {
      authError = new HttpError("Session expired", HttpCode.UNAUTHORIZED);
    } else if (error instanceof JsonWebTokenError) {
      authError = new HttpError("Unauthorized access", HttpCode.UNAUTHORIZED);
    }
    return next(authError ? authError : error);
  }
};
