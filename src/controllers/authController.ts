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

    const TOKEN = process.env.MAILTRAP_API_TOKEN ?? "";
    const transport = nodemailer.createTransport(
      MailtrapTransport({
        token: TOKEN,
      })
    );

    const sender = {
      address: "hello@demomailtrap.co",
      name: "Mailtrap Test",
    };
    const recipients = [user.email];

    await transport.sendMail({
      from: sender,
      to: recipients,
      subject: "You are awesome!",
      html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
      category: "Integration Test",
    });

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
  const { id, token } = request.query;
  try {
    // Find the token inside DB (using owner id). Send error if token not found.
    if (typeof token !== "string") {
      throw new HttpError("Invalid token", HttpCode.BAD_REQUEST);
    }

    // Check if the token is valid or not (because we have the encrypted value). If not valid send error otherwise update user is verified.
    const authToken = await AuthVerificationTokenModel.findOne({ user_id: id });
    if (!authToken) throw new HttpError("Missing token", HttpCode.FORBIDDEN);
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
      expiresIn: "15m",
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
    data: request.user
  })
}
