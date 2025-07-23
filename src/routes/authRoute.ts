import { Router } from "express";
import { createNewUser } from "../controllers/authController";

const appRoute = Router()

appRoute.post("/sign-up", createNewUser)

export default appRoute