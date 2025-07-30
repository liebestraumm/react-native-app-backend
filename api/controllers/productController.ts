import { RequestHandler } from "express";
import HttpCode from "../constants/httpCode";
import { HttpError } from "../lib/HttpError";
import { Product, Asset, User } from "../models";
import { UploadApiResponse } from "cloudinary";
import cloudUploader, { cloudApi } from "../cloud";
import categories from "../lib/categories";

const uploadImage = (filePath: string): Promise<UploadApiResponse> => {
  return cloudUploader.upload(filePath, {
    width: 1280,
    height: 720,
    crop: "fill",
  });
};

export const listNewProduct: RequestHandler = async (
  request,
  response,
  next
) => {
  const { name, price, category, description, purchasingDate } = request.body;
  // Create product with Sequelize
  const newProduct = await Product.create({
    user_id: request.user.id as string,
    name,
    price,
    category,
    description,
    purchasingDate,
  });
  const { images } = request.files;

  const isMultipleImages = Array.isArray(images);

  if (isMultipleImages && images.length > 5) {
    throw new HttpError(
      "Image files can not be more than 5!",
      HttpCode.UNPROCESSABLE_ENTITY
    );
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
  } else {
    if (images) {
      if (!images.mimetype?.startsWith("image")) {
        invalidFileType = true;
      }
    }
  }

  if (invalidFileType)
    throw new HttpError(
      "Invalid file type, files must be image type!",
      HttpCode.UNPROCESSABLE_ENTITY
    );
  try {
    // FILE UPLOAD
    let productImages: any[] = [];
    let productThumbnail: string | undefined;

    if (isMultipleImages) {
      const uploadPromise = images.map((file) => uploadImage(file.filepath));
      // Wait for all file uploads to complete
      const uploadResults = await Promise.all(uploadPromise);
      // Create Asset records for each uploaded image
      const assetPromises = uploadResults.map(({ secure_url, public_id }) => {
        return Asset.create({
          url: secure_url,
          product_id: newProduct.id,
        });
      });
      await Promise.all(assetPromises);
      productImages = uploadResults.map(({ secure_url, public_id }) => {
        return { url: secure_url, id: public_id };
      });

      productThumbnail = productImages[0].url;
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        await Asset.create({
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
  } catch (error) {
    return next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  const { name, price, category, description, purchasingDate, thumbnail } =
    req.body;
  const productId = req.params.id;
  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId))
    throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);
  try {
    const product = await Product.findOne({
      where: { id: productId, user_id: req.user.id as string },
      include: [
        {
          model: Asset,
          as: 'assets',
        },
      ],
    });

    if (!product) throw new HttpError("Product Not Found", HttpCode.NOT_FOUND);

    // Update the product
    await product.update({
      name,
      price,
      category,
      description,
      purchasingDate,
    });

    if (typeof thumbnail === "string") product.thumbnail = thumbnail;

    const { images } = req.files;
    const isMultipleImages = Array.isArray(images);

    if (isMultipleImages) {
      const currentAssets = product.assets || [];
      if (currentAssets.length + images.length > 5)
        throw new HttpError(
          "Image files can not be more than 5!",
          HttpCode.UNPROCESSABLE_ENTITY
        );
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
    } else {
      if (images) {
        if (!images.mimetype?.startsWith("image")) {
          invalidFileType = true;
        }
      }
    }

    if (invalidFileType)
      throw new HttpError(
        "Invalid file type, files must be image type!",
        HttpCode.UNPROCESSABLE_ENTITY
      );

    // FILE UPLOAD
    if (isMultipleImages) {
      const uploadPromise = images.map((file) => uploadImage(file.filepath));
      // Wait for all file uploads to complete
      const uploadResults = await Promise.all(uploadPromise);
      // Create Asset records for each uploaded image
      const assetPromises = uploadResults.map(({ secure_url, public_id }) => {
        return Asset.create({
          url: secure_url,
          product_id: product.id,
        });
      });
      await Promise.all(assetPromises);
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        await Asset.create({
          url: secure_url,
          product_id: product.id,
        });
      }
    }

    res.status(201).json({ message: "Product updated successfully." });
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct: RequestHandler = async (req, res, next) => {
  try {
    const productId = req.params.id;
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId))
      throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await Product.findOne({
      where: { id: productId, user_id: req.user.id as string },
      include: [
        {
          model: Asset,
          as: 'assets',
        },
      ],
    });

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

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
        await cloudApi.delete_resources(publicIds);
      } catch (error) {
        console.log('Error deleting from cloud storage:', error);
      }
    }

    // Delete the product (this will cascade delete assets due to foreign key constraint)
    await product.destroy();

    res.json({ message: "Product removed successfully." });
  } catch (error) {
    return next(error);
  }
};

export const deleteProductImage: RequestHandler = async (req, res, next) => {
  try {
    const { productId, imageId } = req.params;
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId))
      throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await Product.findOne({
      where: { id: productId, user_id: req.user.id as string },
      include: [
        {
          model: Asset,
          as: 'assets',
        },
      ],
    });

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

    // Find the asset to delete
    const assetToDelete = product.assets?.find(asset => asset.id === imageId);
    if (!assetToDelete) {
      throw new HttpError("Image not found", HttpCode.NOT_FOUND);
    }

    // Delete the asset
    await assetToDelete.destroy();

    // Update thumbnail if it was the deleted image
    if (product.thumbnail === assetToDelete.url) {
      const remainingAssets = product.assets?.filter(asset => asset.id !== imageId) || [];
      if (remainingAssets.length > 0) {
        await product.update({ thumbnail: remainingAssets[0].url });
      } else {
        await product.update({ thumbnail: undefined });
      }
    }

    // Remove from cloud storage
    try {
      const urlParts = assetToDelete.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      await cloudUploader.destroy(publicId);
    } catch (error) {
      console.log('Error deleting from cloud storage:', error);
    }

    res.json({ message: "Image removed successfully." });
  } catch (error) {
    return next(error);
  }
};

export const getProductDetail: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id))
      throw new HttpError("Invalid product Id!", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await Product.findByPk(id, {
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "avatar"],
        },
        {
          model: Asset,
          as: "assets",
        },
      ],
    });
    if (!product) throw new HttpError("Product Not Found!", HttpCode.NOT_FOUND);
    const user = await User.findByPk(product.user_id);
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
  } catch (error) {
    return next(error);
  }
};

export const getProductsByCategory: RequestHandler = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { pageNo = "1", limit = "10" } = req.query as {
      pageNo: string;
      limit: string;
    };
    if (!categories.includes(category))
      throw new HttpError("Invalid category!", HttpCode.UNPROCESSABLE_ENTITY);

    const products = await Product.findAll({
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
  } catch (error) {
    return next(error);
  }
};

export const getLatestProducts: RequestHandler = async (req, res, next) => {
  try {
    const products = await Product.findAll({
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
  } catch (error) {
    return next(error);
  }
};

export const getListings: RequestHandler = async (req, res, next) => {
  const { pageNo = "1", limit = "10" } = req.query as {
    pageNo: string;
    limit: string;
  };
  try {
    const products = await Product.findAll({
      where: { user_id: req.user.id as string },
      order: [["createdAt", "DESC"]],
      offset: (+pageNo - 1) * +limit,
      limit: +limit,
      include: [
        {
          model: Asset,
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
  } catch (error) {
    return next(error);
  }
};
