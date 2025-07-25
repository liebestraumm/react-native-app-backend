import { Router } from "express";
import {
  createNewUser,
  generateVerificationLink,
  refreshAccessToken,
  sendProfile,
  signIn,
  verifyEmail,
} from "../controllers/authController";
import validate from "../middleware/validate";
import { newUserSchema, verifyTokenSchema } from "../lib/validators";
import { isAuth } from "../middleware/auth";

const authRoutes = Router();

authRoutes.post("/sign-up", validate(newUserSchema), createNewUser);
authRoutes.post("/verify", validate(verifyTokenSchema), verifyEmail);
authRoutes.post("/verify-token", isAuth, generateVerificationLink);
authRoutes.post("/sign-in", signIn);
authRoutes.get("/profile", isAuth, sendProfile);
// No need to use isAuth middleware as the user will use this endpoint if they are not authenticated (i.e the token is invalid)
authRoutes.post("/refresh-token", refreshAccessToken)

export default authRoutes;
