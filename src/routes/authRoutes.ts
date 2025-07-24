import { Router } from "express";
import {
  createNewUser,
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
authRoutes.post("/sign-in", signIn);
authRoutes.get("/profile", isAuth, sendProfile);

export default authRoutes;
