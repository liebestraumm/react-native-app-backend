import { Router } from "express";
import { initAction, sendData } from "../controllers/productController";

const productRoutes = Router();

productRoutes.get("/listings", initAction);
productRoutes.post("/list", sendData);

export default productRoutes;
