"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const fileParser_1 = __importDefault(require("../middleware/fileParser"));
const validators_1 = require("../lib/validators");
const validate_1 = __importDefault(require("../middleware/validate"));
const productRoutes = (0, express_1.Router)();
productRoutes.post("/list", auth_1.isAuth, fileParser_1.default, (0, validate_1.default)(validators_1.newProductSchema), productController_1.listNewProduct);
productRoutes.patch("/:id", auth_1.isAuth, fileParser_1.default, (0, validate_1.default)(validators_1.newProductSchema), productController_1.updateProduct);
productRoutes.delete("/:id", auth_1.isAuth, productController_1.deleteProduct);
productRoutes.delete("/image/:productId/:imageId", auth_1.isAuth, productController_1.deleteProductImage);
productRoutes.get("/detail/:id", productController_1.getProductDetail);
productRoutes.get("/by-category/:category", productController_1.getProductsByCategory);
productRoutes.get("/latest", productController_1.getLatestProducts);
productRoutes.get("/listings", auth_1.isAuth, productController_1.getListings);
exports.default = productRoutes;
//# sourceMappingURL=productRoutes.js.map