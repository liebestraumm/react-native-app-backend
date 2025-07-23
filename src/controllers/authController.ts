import { RequestHandler } from "express";
import UserModel from "../models/User";
import { HttpError } from "../models/HttpError";
import HttpCode from "../constants/httpCode";
import crypto from "crypto";
import AuthVerificationTokenModel from "../models/AuthVerificationToken";
import "dotenv/config";
import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";

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
      owner: user._id,
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
    next(error);
  }
};
