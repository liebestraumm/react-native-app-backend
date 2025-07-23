import { Router } from "express";
import { initAction, sendData } from "../controllers/productController";

const productRoute = Router();

productRoute.get("/listings", initAction);
productRoute.post("/list", sendData);

export default productRoute;
