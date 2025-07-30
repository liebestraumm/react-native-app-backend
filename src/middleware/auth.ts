import { RequestHandler } from "express";
import { HttpError } from "../models/HttpError";
import HttpCode from "../constants/httpCode";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { User as UserModel, Asset, PasswordResetToken } from "../models";
import { IUserProfile } from "../interfaces/IUserProfile";
import "dotenv/config";

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
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "") as {
      id: string;
    };

    const user = await UserModel.findByPk(payload.id, {
      include: [{ model: Asset, as: 'avatar' }]
    });
    if (!user) throw new HttpError("Unauthorized request", HttpCode.FORBIDDEN);

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      avatar: user.avatar?.url ?? ""
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

export const isValidPassResetToken: RequestHandler = async (req, res, next) => {
  // Read token and id
  const { id, token } = req.body;

  try {
    // Find token inside database with owner id.
    const resetPassToken = await PasswordResetToken.findOne({
      where: { user_id: id },
    });
    // If there is no token send error.
    if (!resetPassToken)
      throw new HttpError(
        "Unauthorized request, invalid token",
        HttpCode.FORBIDDEN
      );
    // Else compare token with encrypted value.
    const matched = await resetPassToken.compareToken(token);
    // If not matched send error.
    if (!matched)
      throw new HttpError(
        "Unauthorized request, token doesn't match",
        HttpCode.FORBIDDEN
      );

    next();
  } catch (error) {
    console.log(error);
    return next(error);
  }
};
