import { Router } from "express";
import {
  createNewUser,
  generateForgetPasswordLink,
  generateVerificationLink,
  grantValid,
  refreshAccessToken,
  sendProfile,
  sendPublicProfile,
  signIn,
  signOut,
  updateAvatar,
  updatePassword,
  updateProfile,
  verifyEmail,
} from "../controllers/authController";
import validate from "../middleware/validate";
import {
  newUserSchema,
  resetPassSchema,
  verifyTokenSchema,
} from "../lib/validators";
import { isAuth, isValidPassResetToken } from "../middleware/auth";
import fileParser from "../middleware/fileParser";

const authRoutes = Router();

authRoutes.post("/sign-up", validate(newUserSchema), createNewUser);
authRoutes.post("/verify", validate(verifyTokenSchema), verifyEmail);
authRoutes.post("/verify-token", isAuth, generateVerificationLink);
authRoutes.post("/sign-in", signIn);
authRoutes.get("/profile", isAuth, sendProfile);
// No need to use isAuth middleware as the user will use this endpoint if they are not authenticated (i.e the token is invalid)
authRoutes.post("/refresh-token", refreshAccessToken);
authRoutes.post("/sign-out", isAuth, signOut);
authRoutes.post("/forget-password", generateForgetPasswordLink);
authRoutes.post(
  "/verify-password-reset-token",
  validate(verifyTokenSchema),
  isValidPassResetToken,
  grantValid
);
authRoutes.post(
  "/reset-password",
  validate(resetPassSchema),
  isValidPassResetToken,
  updatePassword
);
authRoutes.get("/profile:id", isAuth, sendPublicProfile);
authRoutes.put("/profile", isAuth, updateProfile);
authRoutes.put("/update-avatar", isAuth, fileParser, updateAvatar);
export default authRoutes;
