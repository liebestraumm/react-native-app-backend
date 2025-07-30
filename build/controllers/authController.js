"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPublicProfile = exports.updateAvatar = exports.updateProfile = exports.updatePassword = exports.grantValid = exports.generateForgetPasswordLink = exports.signOut = exports.refreshAccessToken = exports.generateVerificationLink = exports.sendProfile = exports.signIn = exports.verifyEmail = exports.createNewUser = void 0;
const models_1 = require("../models");
const HttpError_1 = require("../lib/HttpError");
const httpCode_1 = __importDefault(require("../constants/httpCode"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mail_1 = __importDefault(require("../lib/mail"));
const cloudinary_1 = require("cloudinary");
const sequelize_1 = require("sequelize");
const env_1 = __importDefault(require("../env"));
const VERIFICATION_LINK = env_1.default.VERIFICATION_LINK;
const JWT_SECRET = env_1.default.JWT_SECRET;
const PASSWORD_RESET_LINK = env_1.default.PASSWORD_RESET_LINK;
const CLOUD_NAME = env_1.default.CLOUD_NAME;
const CLOUD_KEY = env_1.default.CLOUD_KEY;
const CLOUD_SECRET = env_1.default.CLOUD_SECRET;
cloudinary_1.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
});
const createNewUser = async (request, response, next) => {
    // Read incoming data like: name, email, password
    const { email, password, name } = request.body;
    try {
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ where: { email } });
        if (existingUser)
            throw new HttpError_1.HttpError("Unauthorized request, email is already in use!", httpCode_1.default.UNAUTHORIZED);
        const user = await models_1.User.create({
            name,
            email,
            password,
            verified: false,
            tokens: [],
        });
        // Generate and Store verification token
        const token = crypto_1.default.randomBytes(36).toString("hex");
        await models_1.AuthVerificationToken.create({
            user_id: user.id,
            token,
        });
        // Send verification link with token to register email.
        const link = `${env_1.default.VERIFICATION_LINK ?? ""}?id=${user.id}&token=${token}`;
        const sender = env_1.default.MAILTRAP_SENDER ?? "";
        const recipients = [user.email];
        const mailBody = {
            subject: "Verification Mail",
            html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
            category: "Integration Test",
        };
        const verificationMail = new mail_1.default(recipients, sender, mailBody);
        verificationMail.send();
        // Send message back to check email inbox.
        response
            .status(201)
            .json({ message: "Please check your inbox for verification link" });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.createNewUser = createNewUser;
const verifyEmail = async (request, response, next) => {
    // Read incoming data like: id and token
    const { id, token } = request.body;
    try {
        // Find the token inside DB (using owner id). Send error if token not found.
        if (typeof token !== "string") {
            throw new HttpError_1.HttpError("Invalid token", httpCode_1.default.BAD_REQUEST);
        }
        // Check if the token is valid or not (because we have the encrypted value). If not valid send error otherwise update user is verified.
        const authToken = await models_1.AuthVerificationToken.findOne({
            where: { user_id: id },
        });
        if (!authToken)
            throw new HttpError_1.HttpError("Unauthorized Request", httpCode_1.default.FORBIDDEN);
        const isMatched = await authToken?.compareToken(token);
        if (!isMatched)
            throw new HttpError_1.HttpError("Invalid token", httpCode_1.default.BAD_REQUEST);
        // Remove token from database.
        await models_1.User.update({ verified: true }, { where: { id } });
        await authToken.destroy();
        // Send success message.
        response
            .status(httpCode_1.default.OK)
            .json({ message: "Thanks for joining us, your email is verified" });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.verifyEmail = verifyEmail;
const signIn = async (request, response, next) => {
    // Read incoming data like: email and password
    const { email, password } = request.body;
    try {
        // Find user with the provided email. Send error if user not found.
        const user = await models_1.User.findOne({
            where: { email },
            include: [{ model: models_1.Asset, as: 'avatar' }]
        });
        if (!user)
            throw new HttpError_1.HttpError("Email/Password mismatch", httpCode_1.default.FORBIDDEN);
        // Check if the password is valid or not.
        const isMatched = await user.comparePassword(password);
        if (!isMatched)
            throw new HttpError_1.HttpError("Email/Password mismatch", httpCode_1.default.FORBIDDEN);
        // Generate access & refresh token if pasword matches.
        const payload = { id: user.id };
        const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET ?? "", {
            expiresIn: "15m",
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET ?? "");
        // Store refresh token inside the Users table.
        if (!user.tokens)
            user.tokens = [refreshToken];
        else
            user.tokens.push(refreshToken);
        await user.save();
        response.status(httpCode_1.default.OK).json({
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
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.signIn = signIn;
const sendProfile = async (request, response, next) => {
    response.status(httpCode_1.default.OK).json({
        profile: request.user,
    });
};
exports.sendProfile = sendProfile;
const generateVerificationLink = async (request, response, next) => {
    const { id, email } = request.user;
    // Generate and Store verification token
    const token = crypto_1.default.randomBytes(36).toString("hex");
    try {
        // Remove previous token if any
        await models_1.AuthVerificationToken.destroy({ where: { user_id: id } });
        // Create/store new token
        await models_1.AuthVerificationToken.create({
            user_id: id,
            token: token,
        });
        // Send link inside users email
        const link = `${VERIFICATION_LINK ?? ""}?id=${id}&token=${token}`;
        const sender = env_1.default.MAILTRAP_SENDER ?? "";
        const recipients = [email];
        const mailBody = {
            subject: "Verification Link",
            html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
            category: "Integration Test",
        };
        const verificationMail = new mail_1.default(recipients, sender, mailBody);
        verificationMail.send();
        response.status(httpCode_1.default.OK).json({ message: "Verification Link sent!" });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.generateVerificationLink = generateVerificationLink;
const refreshAccessToken = async (request, response, next) => {
    // Read and verify refresh token
    const { refreshToken } = request.body;
    try {
        if (!refreshToken)
            throw new HttpError_1.HttpError("Unauthorized request", httpCode_1.default.FORBIDDEN);
        const payload = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET ?? "");
        if (!payload.id)
            throw new HttpError_1.HttpError("Unauthorized request", httpCode_1.default.UNAUTHORIZED);
        // Find user with payload.id and refresh token
        const user = await models_1.User.findOne({
            where: {
                id: payload.id,
                tokens: { [sequelize_1.Op.contains]: [refreshToken] },
            },
            include: [{ model: models_1.Asset, as: 'avatar' }]
        });
        // If the refresh token is valid and no user found, refreshtoken is compromised and hence it can't be used to create another access token
        if (!user) {
            // User is compromised, remove all the previous tokens
            const test = await models_1.User.update({ tokens: [] }, { where: { id: payload.id } });
            console.log(test);
            throw new HttpError_1.HttpError("Unauthorized Request", httpCode_1.default.UNAUTHORIZED);
        }
        // If the token is valid and user is found, create new refresh and access token
        const refreshTokenPayload = { id: user.id };
        const newAccessToken = jsonwebtoken_1.default.sign(refreshTokenPayload, JWT_SECRET ?? "", {
            expiresIn: "15m",
        });
        const newRefreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, JWT_SECRET ?? "");
        // Remove previous token, update user and send new tokens
        user.tokens = user.tokens.filter((token) => token !== refreshToken);
        user.tokens.push(newRefreshToken);
        await user.save();
        response.status(httpCode_1.default.OK).json({
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
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.refreshAccessToken = refreshAccessToken;
const signOut = async (request, response, next) => {
    const { refreshToken } = request.body;
    try {
        // Remove the refresh token
        const user = await models_1.User.findOne({
            where: {
                id: request.user.id,
                tokens: { [sequelize_1.Op.contains]: [refreshToken] },
            },
        });
        if (!user)
            throw new HttpError_1.HttpError("Unauthorized request, user not found", httpCode_1.default.FORBIDDEN);
        const newTokens = user.tokens.filter((token) => token !== refreshToken);
        user.tokens = newTokens;
        await user.save();
        response.status(httpCode_1.default.OK).json({ message: "You're signed out" });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.signOut = signOut;
const generateForgetPasswordLink = async (request, response, next) => {
    // Ask users for email
    const { email } = request.body;
    try {
        // Find users with the given email and send error if there is no user
        const user = await models_1.User.findOne({ where: { email } });
        if (!user)
            throw new HttpError_1.HttpError("Account not found", httpCode_1.default.NOT_FOUND);
        // Remove token
        await models_1.PasswordResetToken.destroy({ where: { user_id: user.id } });
        // Create new token
        const token = crypto_1.default.randomBytes(36).toString("hex");
        await models_1.PasswordResetToken.create({ user_id: user.id, token });
        // Send the link to user's email
        const passResetLink = `${PASSWORD_RESET_LINK}?id=${user.id}&token=${token}`;
        const recipients = [user.email];
        const sender = "security@myapp.com";
        const mailBody = {
            subject: "Reset password Link",
            html: `<p>Click <a href="${passResetLink}">here</a> to update your password.</p>`,
        };
        const resetPasswordMail = new mail_1.default(recipients, sender, mailBody);
        resetPasswordMail.send();
        // Send response back
        response.status(httpCode_1.default.OK).json({ message: "Reset password link sent" });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.generateForgetPasswordLink = generateForgetPasswordLink;
const grantValid = async (request, response, next) => {
    response.json({ valid: true });
};
exports.grantValid = grantValid;
const updatePassword = async (request, response, next) => {
    // Read user id, reset pass token and password.
    const { id, password } = request.body;
    try {
        // If valid find user with the given id.
        const user = await models_1.User.findByPk(id);
        if (!user)
            throw new HttpError_1.HttpError("Unauthorized access", httpCode_1.default.FORBIDDEN);
        // Check if user is using same password.
        const matched = await user.comparePassword(password);
        // If there is no user or user is using the same password send error res.
        if (matched)
            throw new HttpError_1.HttpError("The new password must be different!", httpCode_1.default.UNPROCESSABLE_ENTITY);
        // Else update new password
        user.password = password;
        await user.save();
        // Remove password reset token.
        await models_1.PasswordResetToken.destroy({ where: { user_id: user.id } });
        // Send confirmation email.
        const recipients = [user.email];
        const sender = "security@myapp.com";
        const mailBody = {
            subject: "Reset password Link",
            html: `<h1>Your password is updated, you can now use your new password.</h1>`,
        };
        const resetPasswordMail = new mail_1.default(recipients, sender, mailBody);
        resetPasswordMail.send();
        response
            .status(httpCode_1.default.OK)
            .json({ message: "Password resets successfully." });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.updatePassword = updatePassword;
const updateProfile = async (request, response, next) => {
    const { name } = request.body;
    try {
        // Validate name
        if (typeof name !== "string" || name.trim().length < 3)
            throw new HttpError_1.HttpError("Invalid name", httpCode_1.default.UNPROCESSABLE_ENTITY);
        // Find user and update the name
        await models_1.User.update({ name }, { where: { id: request.user.id } });
        // Send the new profile back
        response.json({
            message: "Profile updated!",
            data: {
                ...request.user,
                name,
            },
        });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.updateProfile = updateProfile;
const updateAvatar = async (request, response, next) => {
    const { avatar } = request.files;
    try {
        if (Array.isArray(avatar)) {
            throw new HttpError_1.HttpError("Multiple files are not allowed", httpCode_1.default.UNPROCESSABLE_ENTITY);
        }
        if (!avatar.mimetype?.startsWith("image")) {
            throw new HttpError_1.HttpError("Invalid image file", httpCode_1.default.UNPROCESSABLE_ENTITY);
        }
        const user = await models_1.User.findByPk(request.user.id, {
            include: [{ model: models_1.Asset, as: 'avatar' }]
        });
        if (!user) {
            throw new HttpError_1.HttpError("user not found", httpCode_1.default.UNPROCESSABLE_ENTITY);
        }
        // If user has an existing avatar, delete it from cloudinary and remove the asset
        if (user.avatarId) {
            const existingAsset = await models_1.Asset.findByPk(user.avatarId);
            if (existingAsset) {
                // Extract public_id from the URL or store it separately
                // For now, we'll assume the URL contains the public_id
                const publicId = existingAsset.url.split('/').pop()?.split('.')[0];
                if (publicId) {
                    await cloudinary_1.v2.uploader.destroy(publicId);
                }
                await existingAsset.destroy();
            }
        }
        // upload avatar file to Cloudinary
        const { secure_url: url, public_id: id } = await cloudinary_1.v2.uploader.upload(avatar.filepath, {
            width: 300,
            height: 300,
            crop: "thumb",
            gravity: "face",
        });
        // Create new asset record
        const newAsset = await models_1.Asset.create({ url });
        // Update user with new avatar
        user.avatarId = newAsset.id;
        await user.save();
        response.json({ profile: { ...request.user, avatar: newAsset.url } });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.updateAvatar = updateAvatar;
const sendPublicProfile = async (request, response, next) => {
    const profileId = request.params.id;
    try {
        const user = await models_1.User.findByPk(profileId, {
            include: [{ model: models_1.Asset, as: 'avatar' }]
        });
        if (!user) {
            throw new HttpError_1.HttpError("Profile not found!", httpCode_1.default.NOT_FOUND);
        }
        response.json({
            profile: { id: user.id, name: user.name, avatar: user.avatar?.url },
        });
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.sendPublicProfile = sendPublicProfile;
//# sourceMappingURL=authController.js.map