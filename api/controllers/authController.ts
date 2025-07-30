import { RequestHandler } from "express";
import { User, Asset, AuthVerificationToken, PasswordResetToken } from "../models";
import { HttpError } from "../lib/HttpError";
import HttpCode from "../constants/httpCode";
import crypto from "crypto";  
import jwt from "jsonwebtoken";
import Mail from "../lib/mail";
import { v2 as cloudinary } from "cloudinary";
import { Op } from "sequelize";
import envs from "../env";


const VERIFICATION_LINK = envs.VERIFICATION_LINK;
const JWT_SECRET = envs.JWT_SECRET;
const PASSWORD_RESET_LINK = envs.PASSWORD_RESET_LINK;
const CLOUD_NAME = envs.CLOUD_NAME;
const CLOUD_KEY = envs.CLOUD_KEY;
const CLOUD_SECRET = envs.CLOUD_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_KEY,
  api_secret: CLOUD_SECRET,
  secure: true,
});

export const createNewUser: RequestHandler = async (
  request,
  response,
  next
) => {
  // Read incoming data like: name, email, password
  const { email, password, name } = request.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      throw new HttpError(
        "Unauthorized request, email is already in use!",
        HttpCode.UNAUTHORIZED
      );

    const user = await User.create({
      name,
      email,
      password,
      verified: false,
      tokens: [],
    });

    // Generate and Store verification token
    const token = crypto.randomBytes(36).toString("hex");
    await AuthVerificationToken.create({
      user_id: user.id,
      token,
    });

    // Send verification link with token to register email.
    const link = `${envs.VERIFICATION_LINK ?? ""}?id=${
      user.id
    }&token=${token}`;
    const sender = envs.MAILTRAP_SENDER ?? "";
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
    const authToken = await AuthVerificationToken.findOne({
      where: { user_id: id },
    });
    if (!authToken)
      throw new HttpError("Unauthorized Request", HttpCode.FORBIDDEN);
    const isMatched = await authToken?.compareToken(token);
    if (!isMatched) throw new HttpError("Invalid token", HttpCode.BAD_REQUEST);

    // Remove token from database.
    await User.update({ verified: true }, { where: { id } });
    await authToken.destroy();

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
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Asset, as: 'avatar' }]
    });
    if (!user)
      throw new HttpError("Email/Password mismatch", HttpCode.FORBIDDEN);
    // Check if the password is valid or not.
    const isMatched = await user.comparePassword(password);
    if (!isMatched)
      throw new HttpError("Email/Password mismatch", HttpCode.FORBIDDEN);

    // Generate access & refresh token if pasword matches.
    const payload = { id: user.id };
    const accessToken = jwt.sign(payload, JWT_SECRET ?? "", {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payload, JWT_SECRET ?? "");

    // Store refresh token inside the Users table.
    if (!user.tokens) user.tokens = [refreshToken];
    else user.tokens.push(refreshToken);
    await user.save();

    response.status(HttpCode.OK).json({
      message: "You are signed in!",
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified,
        avatar: user.avatar?.url,
      },
      tokens: { refresh: refreshToken, access: accessToken },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const sendProfile: RequestHandler = async (request, response, next) => {
  response.status(HttpCode.OK).json({
    profile: request.user,
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
    await AuthVerificationToken.destroy({ where: { user_id: id as string } });
    // Create/store new token
    await AuthVerificationToken.create({
      user_id: id as string,
      token: token,
    });
    // Send link inside users email
    const link = `${
      VERIFICATION_LINK ?? ""
    }?id=${id}&token=${token}`;
    const sender = envs.MAILTRAP_SENDER ?? "";
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
    const payload = jwt.verify(refreshToken, JWT_SECRET ?? "") as {
      id: string;
    };

    if (!payload.id)
      throw new HttpError("Unauthorized request", HttpCode.UNAUTHORIZED);

    // Find user with payload.id and refresh token
    const user = await User.findOne({
      where: {
        id: payload.id as string,
        tokens: { [Op.contains]: [refreshToken] },
      },
      include: [{ model: Asset, as: 'avatar' }]
    });
    // If the refresh token is valid and no user found, refreshtoken is compromised and hence it can't be used to create another access token
    if (!user) {
      // User is compromised, remove all the previous tokens
      const test = await User.update(
        { tokens: [] },
        { where: { id: payload.id } }
      );
      console.log(test);
      throw new HttpError("Unauthorized Request", HttpCode.UNAUTHORIZED);
    }
    // If the token is valid and user is found, create new refresh and access token
    const refreshTokenPayload = { id: user.id };
    const newAccessToken = jwt.sign(
      refreshTokenPayload,
      JWT_SECRET ?? "",
      {
        expiresIn: "15m",
      }
    );
    const newRefreshToken = jwt.sign(
      refreshTokenPayload,
      JWT_SECRET ?? ""
    );

    // Remove previous token, update user and send new tokens
    user.tokens = user.tokens.filter((token) => token !== refreshToken);
    user.tokens.push(newRefreshToken);
    await user.save();
    response.status(HttpCode.OK).json({
      message: "Tokens updated!",
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified,
        avatar: user.avatar?.url,
      },
      tokens: {
        refresh: newRefreshToken,
        access: newAccessToken,
      },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const signOut: RequestHandler = async (request, response, next) => {
  const { refreshToken } = request.body;
  try {
    // Remove the refresh token
    const user = await User.findOne({
      where: {
        id: request.user.id as string,
        tokens: { [Op.contains]: [refreshToken] },
      },
    });
    if (!user)
      throw new HttpError(
        "Unauthorized request, user not found",
        HttpCode.FORBIDDEN
      );
    const newTokens = user.tokens.filter((token) => token !== refreshToken);
    user.tokens = newTokens;
    await user.save();
    response.status(HttpCode.OK).json({ message: "You're signed out" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const generateForgetPasswordLink: RequestHandler = async (
  request,
  response,
  next
) => {
  // Ask users for email
  const { email } = request.body;
  try {
    // Find users with the given email and send error if there is no user
    const user = await User.findOne({ where: { email } });
    if (!user) throw new HttpError("Account not found", HttpCode.NOT_FOUND);

    // Remove token
    await PasswordResetToken.destroy({ where: { user_id: user.id } });

    // Create new token
    const token = crypto.randomBytes(36).toString("hex");
    await PasswordResetToken.create({ user_id: user.id, token });

    // Send the link to user's email
    const passResetLink = `${PASSWORD_RESET_LINK}?id=${user.id}&token=${token}`;
    const recipients = [user.email];
    const sender = "security@myapp.com";
    const mailBody = {
      subject: "Reset password Link",
      html: `<p>Click <a href="${passResetLink}">here</a> to update your password.</p>`,
    };
    const resetPasswordMail = new Mail(recipients, sender, mailBody);
    resetPasswordMail.send();
    // Send response back
    response.status(HttpCode.OK).json({ message: "Reset password link sent" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const grantValid: RequestHandler = async (request, response, next) => {
  response.json({ valid: true });
};

export const updatePassword: RequestHandler = async (
  request,
  response,
  next
) => {
  // Read user id, reset pass token and password.
  const { id, password } = request.body;
  try {
    // If valid find user with the given id.
    const user = await User.findByPk(id);
    if (!user) throw new HttpError("Unauthorized access", HttpCode.FORBIDDEN);
    // Check if user is using same password.
    const matched = await user.comparePassword(password);
    // If there is no user or user is using the same password send error res.
    if (matched)
      throw new HttpError(
        "The new password must be different!",
        HttpCode.UNPROCESSABLE_ENTITY
      );
    // Else update new password
    user.password = password;
    await user.save();

    // Remove password reset token.
    await PasswordResetToken.destroy({ where: { user_id: user.id } });

    // Send confirmation email.
    const recipients = [user.email];
    const sender = "security@myapp.com";
    const mailBody = {
      subject: "Reset password Link",
      html: `<h1>Your password is updated, you can now use your new password.</h1>`,
    };
    const resetPasswordMail = new Mail(recipients, sender, mailBody);
    resetPasswordMail.send();
    response
      .status(HttpCode.OK)
      .json({ message: "Password resets successfully." });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const updateProfile: RequestHandler = async (
  request,
  response,
  next
) => {
  const { name } = request.body;
  try {
    // Validate name
    if (typeof name !== "string" || name.trim().length < 3)
      throw new HttpError("Invalid name", HttpCode.UNPROCESSABLE_ENTITY);
    // Find user and update the name
    await User.update({ name }, { where: { id: request.user.id as string } });
    // Send the new profile back
    response.json({
      message: "Profile updated!",
      data: {
        ...request.user,
        name,
      },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const updateAvatar: RequestHandler = async (request, response, next) => {
  const { avatar } = request.files;
  try {
    if (Array.isArray(avatar)) {
      throw new HttpError(
        "Multiple files are not allowed",
        HttpCode.UNPROCESSABLE_ENTITY
      );
    }

    if (!avatar.mimetype?.startsWith("image")) {
      throw new HttpError("Invalid image file", HttpCode.UNPROCESSABLE_ENTITY);
    }

    const user = await User.findByPk(request.user.id as string, {
      include: [{ model: Asset, as: 'avatar' }]
    });
    if (!user) {
      throw new HttpError("user not found", HttpCode.UNPROCESSABLE_ENTITY);
    }

    // If user has an existing avatar, delete it from cloudinary and remove the asset
    if (user.avatarId) {
      const existingAsset = await Asset.findByPk(user.avatarId);
      if (existingAsset) {
        // Extract public_id from the URL or store it separately
        // For now, we'll assume the URL contains the public_id
        const publicId = existingAsset.url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
        await existingAsset.destroy();
      }
    }

    // upload avatar file to Cloudinary
    const { secure_url: url, public_id: id } = await cloudinary.uploader.upload(
      avatar.filepath,
      {
        width: 300,
        height: 300,
        crop: "thumb",
        gravity: "face",
      }
    );

    // Create new asset record
    const newAsset = await Asset.create({ url });
    
    // Update user with new avatar
    user.avatarId = newAsset.id;
    await user.save();

    response.json({ profile: { ...request.user, avatar: newAsset.url } });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const sendPublicProfile: RequestHandler = async (
  request,
  response,
  next
) => {
  const profileId = request.params.id;
  try {
    const user = await User.findByPk(profileId, {
      include: [{ model: Asset, as: 'avatar' }]
    });
    if (!user) {
      throw new HttpError("Profile not found!", HttpCode.NOT_FOUND);
    }

    response.json({
      profile: { id: user.id, name: user.name, avatar: user.avatar?.url },
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};
