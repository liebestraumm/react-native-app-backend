import { RequestHandler } from "express";
import UserModel from "../models/User";
import { HttpError } from "../models/HttpError";
import HttpCode from "../constants/httpCode";
import crypto from "crypto";
import AuthVerificationTokenModel from "../models/AuthVerificationToken";
import "dotenv/config";
import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import jwt from "jsonwebtoken";
import Mail from "../lib/mail";

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

    const user = await UserModel.create({ name, email, password });

    // Generate and Store verification token
    const token = crypto.randomBytes(36).toString("hex");
    await AuthVerificationTokenModel.create({
      user_id: user._id,
      token,
    });

    // Send verification link with token to register email.
    const link = `${process.env.VERIFICATION_LINK ?? ""}?id=${
      user._id
    }&token=${token}`;
    const sender = {
      address: "noreply@demomailtrap.co",
      name: "Mailtrap Test",
    };
    const recipients = [user.email];
    const mailBody = {
      subject: "Verification Mail",
      html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
      category: "Integration Test",
    };
    const verificationMail = new Mail(recipients, sender, mailBody);
    verificationMail.send();
    // Send message back to check email inbox.
    response
      .status(201)
      .json({ message: "Please check your inbox for verification link" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const verifyEmail: RequestHandler = async (request, response, next) => {
  // Read incoming data like: id and token
  const { id, token } = request.body;
  try {
    // Find the token inside DB (using owner id). Send error if token not found.
    if (typeof token !== "string") {
      throw new HttpError("Invalid token", HttpCode.BAD_REQUEST);
    }

    // Check if the token is valid or not (because we have the encrypted value). If not valid send error otherwise update user is verified.
    const authToken = await AuthVerificationTokenModel.findOne({ user_id: id });
    if (!authToken)
      throw new HttpError("Unauthorized Request", HttpCode.FORBIDDEN);
    const isMatched = await authToken?.compareToken(token);
    if (!isMatched) throw new HttpError("Invalid token", HttpCode.BAD_REQUEST);

    // Remove token from database.
    await UserModel.findByIdAndUpdate(id, { verified: true });
    await AuthVerificationTokenModel.findByIdAndDelete(authToken._id);

    // Send success message.
    response
      .status(HttpCode.OK)
      .json({ message: "Thanks for joining us, your email is verified" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const signIn: RequestHandler = async (request, response, next) => {
  // Read incoming data like: email and password
  const { email, password } = request.body;
  try {
    // Find user with the provided email. Send error if user not found.
    const user = await UserModel.findOne({ email });
    if (!user)
      throw new HttpError("Email/Password mismatch", HttpCode.FORBIDDEN);
    // Check if the password is valid or not.
    const isMatched = await user.comparePassword(password);
    if (!isMatched)
      throw new HttpError("Email/Password mismatch", HttpCode.FORBIDDEN);

    // Generate access & refresh token if pasword matches.
    const payload = { id: user._id };
    const accessToken = jwt.sign(payload, "secret", {
      expiresIn: "1m",
    });
    const refreshToken = jwt.sign(payload, "secret");

    // Store refresh token inside the Users table.
    if (!user.tokens) user.tokens = [refreshToken];
    else user.tokens.push(refreshToken);
    await user.save();

    response.status(HttpCode.OK).json({
      message: "You are signed in!",
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        verified: user.verified,
        tokens: { refresh: refreshToken, access: accessToken },
      },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const sendProfile: RequestHandler = async (request, response, next) => {
  response.status(HttpCode.OK).json({
    data: request.user,
  });
};

export const generateVerificationLink: RequestHandler = async (
  request,
  response,
  next
) => {
  const { id, email } = request.user;
  // Generate and Store verification token
  const token = crypto.randomBytes(36).toString("hex");
  try {
    // Remove previous token if any
    await AuthVerificationTokenModel.findOneAndDelete({ user_id: id });
    // Create/store new token
    await AuthVerificationTokenModel.create({
      user_id: id,
      token: token,
    });
    // Send link inside users email
    const link = `${
      process.env.VERIFICATION_LINK ?? ""
    }?id=${id}&token=${token}`;
    const sender = {
      address: "noreply@demomailtrap.co",
      name: "Mailtrap Test",
    };
    const recipients = [email];
    const mailBody = {
      subject: "Verification Link",
      html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
      category: "Integration Test",
    };
    const verificationMail = new Mail(recipients, sender, mailBody);
    verificationMail.send();
    response.status(HttpCode.OK).json({ message: "Verification Link sent!" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const refreshAccessToken: RequestHandler = async (
  request,
  response,
  next
) => {
  // Read and verify refresh token
  const { refreshToken } = request.body;
  try {
    if (!refreshToken)
      throw new HttpError("Unauthorized request", HttpCode.FORBIDDEN);
    const payload = jwt.verify(refreshToken, "secret") as { id: string };

    if (!payload.id) throw new HttpError("Unauthorized request", HttpCode.UNAUTHORIZED)

          // Find user with payload.id and refresh token
    const user = await UserModel.findOne({
      _id: payload.id,
      tokens: refreshToken,
    });
    // If the refresh token is valid and no user found, refreshtoken is compromised and hence it can't be used to create another access token
    if (!user) {
      // User is compromised, remove all the previous tokens
      const test = await UserModel.findByIdAndUpdate(payload.id, { tokens: [] });
      console.log(test)
      throw new HttpError("Unauthorized Request", HttpCode.UNAUTHORIZED);
    }
    // If the token is valid and user is found, create new refresh and access token
    const refreshTokenPayload = { id: user._id };
    const newAccessToken = jwt.sign(refreshTokenPayload, "secret", {
      expiresIn: "1m",
    });
    const newRefreshToken = jwt.sign(refreshTokenPayload, "secret");

    // Remove previous token, update user and send new tokens
    user.tokens = user.tokens.filter((token) => token !== refreshToken);
    user.tokens.push(newRefreshToken)
    await user.save();
    response.status(HttpCode.OK).json({
      message: "Tokens updated!",
      data: {
        refresh: newRefreshToken,
        access: newAccessToken,
      },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};
