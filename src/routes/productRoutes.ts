import { Router } from "express";
import { deleteProduct, deleteProductImage, getLatestProducts, getListings, getProductDetail, getProductsByCategory, listNewProduct, updateProduct } from "../controllers/productController";
import { isAuth } from "../middleware/auth";
import fileParser from "../middleware/fileParser";
import { newProductSchema } from "../lib/validators";
import validate from "../middleware/validate";

const productRoutes = Router();

productRoutes.post(
  "/list",
  isAuth,
  fileParser,
  validate(newProductSchema),
  listNewProduct
);

productRoutes.patch(
  "/:id",
  isAuth,
  fileParser,
  validate(newProductSchema),
  updateProduct
);
productRoutes.delete("/:id", isAuth, deleteProduct);
productRoutes.delete("/image/:productId/:imageId", isAuth, deleteProductImage);
productRoutes.get("/detail/:id", getProductDetail);
productRoutes.get("/by-category/:category", getProductsByCategory);
productRoutes.get("/latest", getLatestProducts);
productRoutes.get("/listings", isAuth, getListings);

export default productRoutes;
