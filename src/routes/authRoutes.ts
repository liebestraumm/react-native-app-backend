import { Router } from "express";
import { createNewUser, verifyEmail } from "../controllers/authController";
import validate from "../middleware/validate";
import { newUserSchema, verifyTokenSchema } from "../lib/validators";

const authRoutes = Router()

authRoutes.post("/sign-up", validate(newUserSchema),createNewUser)
authRoutes.post("/verify", validate(verifyTokenSchema),verifyEmail)

export default authRoutes