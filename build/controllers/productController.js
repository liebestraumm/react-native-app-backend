"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getListings = exports.getLatestProducts = exports.getProductsByCategory = exports.getProductDetail = exports.deleteProductImage = exports.deleteProduct = exports.updateProduct = exports.listNewProduct = void 0;
const httpCode_1 = __importDefault(require("../constants/httpCode"));
const HttpError_1 = require("../lib/HttpError");
const models_1 = require("../models");
const cloud_1 = __importStar(require("../cloud"));
const categories_1 = __importDefault(require("../lib/categories"));
const uploadImage = (filePath) => {
    return cloud_1.default.upload(filePath, {
        width: 1280,
        height: 720,
        crop: "fill",
    });
};
const listNewProduct = async (request, response, next) => {
    const { name, price, category, description, purchasingDate } = request.body;
    // Create product with Sequelize
    const newProduct = await models_1.Product.create({
        user_id: request.user.id,
        name,
        price,
        category,
        description,
        purchasingDate,
    });
    const { images } = request.files;
    const isMultipleImages = Array.isArray(images);
    if (isMultipleImages && images.length > 5) {
        throw new HttpError_1.HttpError("Image files can not be more than 5!", httpCode_1.default.UNPROCESSABLE_ENTITY);
    }
    let invalidFileType = false;
    // if this is the case we have multiple images inside the req.files.images from fileParser middleware
    if (isMultipleImages) {
        for (let img of images) {
            if (!img.mimetype?.startsWith("image")) {
                invalidFileType = true;
                break;
            }
        }
    }
    else {
        if (images) {
            if (!images.mimetype?.startsWith("image")) {
                invalidFileType = true;
            }
        }
    }
    if (invalidFileType)
        throw new HttpError_1.HttpError("Invalid file type, files must be image type!", httpCode_1.default.UNPROCESSABLE_ENTITY);
    try {
        // FILE UPLOAD
        let productImages = [];
        let productThumbnail;
        if (isMultipleImages) {
            const uploadPromise = images.map((file) => uploadImage(file.filepath));
            // Wait for all file uploads to complete
            const uploadResults = await Promise.all(uploadPromise);
            // Create Asset records for each uploaded image
            const assetPromises = uploadResults.map(({ secure_url, public_id }) => {
                return models_1.Asset.create({
                    url: secure_url,
                    product_id: newProduct.id,
                });
            });
            await Promise.all(assetPromises);
            productImages = uploadResults.map(({ secure_url, public_id }) => {
                return { url: secure_url, id: public_id };
            });
            productThumbnail = productImages[0].url;
        }
        else {
            if (images) {
                const { secure_url, public_id } = await uploadImage(images.filepath);
                await models_1.Asset.create({
                    url: secure_url,
                    product_id: newProduct.id,
                });
                productImages = [{ url: secure_url, id: public_id }];
                productThumbnail = secure_url;
            }
        }
        // Update the product with thumbnail
        await newProduct.update({
            thumbnail: productThumbnail,
        });
        response.status(201).json({ message: "New product added!" });
    }
    catch (error) {
        return next(error);
    }
};
exports.listNewProduct = listNewProduct;
const updateProduct = async (req, res, next) => {
    const { name, price, category, description, purchasingDate, thumbnail } = req.body;
    const productId = req.params.id;
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId))
        throw new HttpError_1.HttpError("Invalid product Id", httpCode_1.default.UNPROCESSABLE_ENTITY);
    try {
        const product = await models_1.Product.findOne({
            where: { id: productId, user_id: req.user.id },
            include: [
                {
                    model: models_1.Asset,
                    as: 'assets',
                },
            ],
        });
        if (!product)
            throw new HttpError_1.HttpError("Product Not Found", httpCode_1.default.NOT_FOUND);
        // Update the product
        await product.update({
            name,
            price,
            category,
            description,
            purchasingDate,
        });
        if (typeof thumbnail === "string")
            product.thumbnail = thumbnail;
        const { images } = req.files;
        const isMultipleImages = Array.isArray(images);
        if (isMultipleImages) {
            const currentAssets = product.assets || [];
            if (currentAssets.length + images.length > 5)
                throw new HttpError_1.HttpError("Image files can not be more than 5!", httpCode_1.default.UNPROCESSABLE_ENTITY);
        }
        let invalidFileType = false;
        // if this is the case we have multiple images
        if (isMultipleImages) {
            for (let img of images) {
                if (!img.mimetype?.startsWith("image")) {
                    invalidFileType = true;
                    break;
                }
            }
        }
        else {
            if (images) {
                if (!images.mimetype?.startsWith("image")) {
                    invalidFileType = true;
                }
            }
        }
        if (invalidFileType)
            throw new HttpError_1.HttpError("Invalid file type, files must be image type!", httpCode_1.default.UNPROCESSABLE_ENTITY);
        // FILE UPLOAD
        if (isMultipleImages) {
            const uploadPromise = images.map((file) => uploadImage(file.filepath));
            // Wait for all file uploads to complete
            const uploadResults = await Promise.all(uploadPromise);
            // Create Asset records for each uploaded image
            const assetPromises = uploadResults.map(({ secure_url, public_id }) => {
                return models_1.Asset.create({
                    url: secure_url,
                    product_id: product.id,
                });
            });
            await Promise.all(assetPromises);
        }
        else {
            if (images) {
                const { secure_url, public_id } = await uploadImage(images.filepath);
                await models_1.Asset.create({
                    url: secure_url,
                    product_id: product.id,
                });
            }
        }
        res.status(201).json({ message: "Product updated successfully." });
    }
    catch (error) {
        return next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(productId))
            throw new HttpError_1.HttpError("Invalid product Id", httpCode_1.default.UNPROCESSABLE_ENTITY);
        const product = await models_1.Product.findOne({
            where: { id: productId, user_id: req.user.id },
            include: [
                {
                    model: models_1.Asset,
                    as: 'assets',
                },
            ],
        });
        if (!product)
            throw new HttpError_1.HttpError("Product not found", httpCode_1.default.NOT_FOUND);
        // Delete associated assets from cloud storage
        const assets = product.assets || [];
        if (assets.length > 0) {
            // Extract public_ids from URLs (this is a simplified approach)
            // In a real implementation, you might want to store public_id in the Asset model
            const publicIds = assets.map(asset => {
                // Extract public_id from URL - this is a simplified approach
                const urlParts = asset.url.split('/');
                const filename = urlParts[urlParts.length - 1];
                return filename.split('.')[0]; // Remove extension
            });
            try {
                await cloud_1.cloudApi.delete_resources(publicIds);
            }
            catch (error) {
                console.log('Error deleting from cloud storage:', error);
            }
        }
        // Delete the product (this will cascade delete assets due to foreign key constraint)
        await product.destroy();
        res.json({ message: "Product removed successfully." });
    }
    catch (error) {
        return next(error);
    }
};
exports.deleteProduct = deleteProduct;
const deleteProductImage = async (req, res, next) => {
    try {
        const { productId, imageId } = req.params;
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(productId))
            throw new HttpError_1.HttpError("Invalid product Id", httpCode_1.default.UNPROCESSABLE_ENTITY);
        const product = await models_1.Product.findOne({
            where: { id: productId, user_id: req.user.id },
            include: [
                {
                    model: models_1.Asset,
                    as: 'assets',
                },
            ],
        });
        if (!product)
            throw new HttpError_1.HttpError("Product not found", httpCode_1.default.NOT_FOUND);
        // Find the asset to delete
        const assetToDelete = product.assets?.find(asset => asset.id === imageId);
        if (!assetToDelete) {
            throw new HttpError_1.HttpError("Image not found", httpCode_1.default.NOT_FOUND);
        }
        // Delete the asset
        await assetToDelete.destroy();
        // Update thumbnail if it was the deleted image
        if (product.thumbnail === assetToDelete.url) {
            const remainingAssets = product.assets?.filter(asset => asset.id !== imageId) || [];
            if (remainingAssets.length > 0) {
                await product.update({ thumbnail: remainingAssets[0].url });
            }
            else {
                await product.update({ thumbnail: undefined });
            }
        }
        // Remove from cloud storage
        try {
            const urlParts = assetToDelete.url.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicId = filename.split('.')[0];
            await cloud_1.default.destroy(publicId);
        }
        catch (error) {
            console.log('Error deleting from cloud storage:', error);
        }
        res.json({ message: "Image removed successfully." });
    }
    catch (error) {
        return next(error);
    }
};
exports.deleteProductImage = deleteProductImage;
const getProductDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id))
            throw new HttpError_1.HttpError("Invalid product Id!", httpCode_1.default.UNPROCESSABLE_ENTITY);
        const product = await models_1.Product.findByPk(id, {
            include: [
                {
                    model: models_1.User,
                    as: "owner",
                    attributes: ["id", "name", "avatar"],
                },
                {
                    model: models_1.Asset,
                    as: "assets",
                },
            ],
        });
        if (!product)
            throw new HttpError_1.HttpError("Product Not Found!", httpCode_1.default.NOT_FOUND);
        const user = await models_1.User.findByPk(product.user_id);
        res.json({
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                thumbnail: product.thumbnail,
                category: product.category,
                date: product.purchasingDate,
                price: product.price,
                image: product.assets?.map((asset) => asset.url),
                seller: { ...user },
            },
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.getProductDetail = getProductDetail;
const getProductsByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        const { pageNo = "1", limit = "10" } = req.query;
        if (!categories_1.default.includes(category))
            throw new HttpError_1.HttpError("Invalid category!", httpCode_1.default.UNPROCESSABLE_ENTITY);
        const products = await models_1.Product.findAll({
            where: { category },
            order: [["createdAt", "DESC"]],
            offset: (+pageNo - 1) * +limit,
            limit: +limit,
        });
        const listings = products.map((p) => {
            return {
                id: p.id,
                name: p.name,
                thumbnail: p.thumbnail,
                category: p.category,
                price: p.price,
            };
        });
        res.json({ products: listings });
    }
    catch (error) {
        return next(error);
    }
};
exports.getProductsByCategory = getProductsByCategory;
const getLatestProducts = async (req, res, next) => {
    try {
        const products = await models_1.Product.findAll({
            order: [["createdAt", "DESC"]],
            limit: 10,
        });
        const listings = products.map((p) => {
            return {
                id: p.id,
                name: p.name,
                thumbnail: p.thumbnail,
                category: p.category,
                price: p.price,
            };
        });
        res.json({ products: listings });
    }
    catch (error) {
        return next(error);
    }
};
exports.getLatestProducts = getLatestProducts;
const getListings = async (req, res, next) => {
    const { pageNo = "1", limit = "10" } = req.query;
    try {
        const products = await models_1.Product.findAll({
            where: { user_id: req.user.id },
            order: [["createdAt", "DESC"]],
            offset: (+pageNo - 1) * +limit,
            limit: +limit,
            include: [
                {
                    model: models_1.Asset,
                    as: "assets",
                },
            ],
        });
        const listings = products.map((p) => {
            return {
                id: p.id,
                name: p.name,
                thumbnail: p.thumbnail,
                category: p.category,
                price: p.price,
                image: p.assets?.map((asset) => asset.url),
                date: p.purchasingDate,
                description: p.description,
                seller: {
                    id: req.user.id,
                    name: req.user.name,
                    avatar: req.user.avatar,
                },
            };
        });
        res.json({ products: listings });
    }
    catch (error) {
        return next(error);
    }
};
exports.getListings = getListings;
//# sourceMappingURL=productController.js.map