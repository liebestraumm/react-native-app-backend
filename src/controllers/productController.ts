import { RequestHandler } from "express";
import HttpCode from "../constants/httpCode";
import { HttpError } from "../models/HttpError";
import Product from "../models/Product";
import { UploadApiResponse } from "cloudinary";
import cloudUploader, { cloudApi } from "../cloud";
import categories from "../lib/categories";
import User from "../models/User";

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
      // Add the image URLs and public IDs to the product's images field
      productImages = uploadResults.map(({ secure_url, public_id }) => {
        return { url: secure_url, id: public_id };
      });

      productThumbnail = productImages[0].url;
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        productImages = [{ url: secure_url, id: public_id }];
        productThumbnail = secure_url;
      }
    }

    // Update the product with images
    await newProduct.update({
      images: productImages,
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
      const oldImages = product.images?.length || 0;
      if (oldImages + images.length > 5)
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
      // Add the image URLs and public IDs to the product's images field
      const newImages = uploadResults.map(({ secure_url, public_id }) => {
        return { url: secure_url, id: public_id };
      });

      const currentImages = product.images || [];
      const updatedImages = [...currentImages, ...newImages];
      await product.update({ images: updatedImages });
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        const currentImages = product.images || [];
        const updatedImages = [
          ...currentImages,
          { url: secure_url, id: public_id },
        ];
        await product.update({ images: updatedImages });
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
    });

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

    // Delete the product
    await product.destroy();

    const images = product.images || [];
    if (images.length) {
      const ids = images.map(({ id }) => id);
      await cloudApi.delete_resources(ids);
    }

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
    });

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

    // Remove the image from the images array
    const currentImages = product.images || [];
    const updatedImages = currentImages.filter((img) => img.id !== imageId);
    await product.update({ images: updatedImages });

    if (product.thumbnail?.includes(imageId)) {
      const images = updatedImages;
      if (images.length > 0) {
        await product.update({ thumbnail: images[0].url });
      } else {
        await product.update({ thumbnail: "" });
      }
    }

    // removing from cloud storage
    await cloudUploader.destroy(imageId);

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
        image: product.images?.map(({ url }) => url),
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
    });

    const listings = products.map((p) => {
      return {
        id: p.id,
        name: p.name,
        thumbnail: p.thumbnail,
        category: p.category,
        price: p.price,
        image: p.images?.map((i) => i.url),
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
