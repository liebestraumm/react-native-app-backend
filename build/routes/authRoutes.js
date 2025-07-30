"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = __importDefault(require("../middleware/validate"));
const validators_1 = require("../lib/validators");
const auth_1 = require("../middleware/auth");
const fileParser_1 = __importDefault(require("../middleware/fileParser"));
const authRoutes = (0, express_1.Router)();
authRoutes.post("/sign-up", (0, validate_1.default)(validators_1.newUserSchema), authController_1.createNewUser);
authRoutes.post("/verify", (0, validate_1.default)(validators_1.verifyTokenSchema), authController_1.verifyEmail);
authRoutes.post("/verify-token", auth_1.isAuth, authController_1.generateVerificationLink);
authRoutes.post("/sign-in", authController_1.signIn);
authRoutes.get("/profile", auth_1.isAuth, authController_1.sendProfile);
// No need to use isAuth middleware as the user will use this endpoint if they are not authenticated (i.e the token is invalid)
authRoutes.post("/refresh-token", authController_1.refreshAccessToken);
authRoutes.post("/sign-out", auth_1.isAuth, authController_1.signOut);
authRoutes.post("/forget-password", authController_1.generateForgetPasswordLink);
authRoutes.post("/verify-password-reset-token", (0, validate_1.default)(validators_1.verifyTokenSchema), auth_1.isValidPassResetToken, authController_1.grantValid);
authRoutes.post("/reset-password", (0, validate_1.default)(validators_1.resetPassSchema), auth_1.isValidPassResetToken, authController_1.updatePassword);
authRoutes.get("/profile/:id", auth_1.isAuth, authController_1.sendPublicProfile);
authRoutes.put("/profile", auth_1.isAuth, authController_1.updateProfile);
authRoutes.put("/update-avatar", auth_1.isAuth, fileParser_1.default, authController_1.updateAvatar);
exports.default = authRoutes;
//# sourceMappingURL=authRoutes.js.map