import { Router } from "express";
import { createNewUser } from "../controllers/authController";
import validate from "../middleware/validate";
import { newUserSchema } from "../lib/validators";

const appRoute = Router()

appRoute.post("/sign-up", validate(newUserSchema),createNewUser)

export default appRoute