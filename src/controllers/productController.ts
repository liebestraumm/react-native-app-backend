import { RequestHandler } from "express";
import HttpCode from "../constants/httpCode";
import { HttpError } from "../models/HttpError";
import ProductModel from "../models/Product";
import { UploadApiResponse } from "cloudinary";
import cloudUploader, { cloudApi } from "../cloud";
import categories from "../lib/categories";
import { isValidObjectId } from "mongoose";
import { IUserDocument } from "../interfaces/IUserDocument";

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
  // Instead of using the create function, do this and then use the save method, which is the same:
  const newProduct = new ProductModel({
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
    if (isMultipleImages) {
      const uploadPromise = images.map((file) => uploadImage(file.filepath));
      // Wait for all file uploads to complete
      const uploadResults = await Promise.all(uploadPromise);
      // Add the image URLs and public IDs to the product's images field
      newProduct.images = uploadResults.map(({ secure_url, public_id }) => {
        return { url: secure_url, id: public_id };
      });

      newProduct.thumbnail = newProduct.images[0].url;
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        newProduct.images = [{ url: secure_url, id: public_id }];
        newProduct.thumbnail = secure_url;
      }
    }

    await newProduct.save();

    response.status(201).json({ message: "Added new product!" });
  } catch (error) {
    return next(error)
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  /*
User must be authenticated.
User can upload images as well.
Validate incoming data.
Update normal properties (if the product is made by the same user).
Upload and update images (restrict image qty).
And send the response back.
    */
  const { name, price, category, description, purchasingDate, thumbnail } =
    req.body;
  const productId = req.params.id;
  if (!isValidObjectId(productId))
    throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);
  try {
    const product = await ProductModel.findOneAndUpdate(
      { _id: productId, owner: req.user.id },
      {
        name,
        price,
        category,
        description,
        purchasingDate,
      },
      {
        new: true,
      }
    );
    if (!product) throw new HttpError("Product Not Found", HttpCode.NOT_FOUND);

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

      if (product.images) product.images.push(...newImages);
      else product.images = newImages;
    } else {
      if (images) {
        const { secure_url, public_id } = await uploadImage(images.filepath);
        if (product.images)
          product.images.push({ url: secure_url, id: public_id });
        else product.images = [{ url: secure_url, id: public_id }];
      }
    }

    await product.save();

    res.status(201).json({ message: "Product updated successfully." });
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct: RequestHandler = async (req, res, next) => {
  /*
User must be authenticated.
Validate the product id.
Remove if it is made by the same user.
Remove images as well.
And send the response back.
    */
  try {
    const productId = req.params.id;
    if (!isValidObjectId(productId))
      throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await ProductModel.findOneAndDelete({
      _id: productId,
      owner: req.user.id,
    });

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

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
  /*
1. User must be authenticated.
2. Validate the product id.
3. Remove the image from db (if it is made by the same user).
4. Remove from cloud as well.
5. And send the response back.
    */
  try {
    const { productId, imageId } = req.params;
    if (!isValidObjectId(productId))
      throw new HttpError("Invalid product Id", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await ProductModel.findOneAndUpdate(
      { _id: productId, owner: req.user.id },
      {
        $pull: {
          images: { id: imageId },
        },
      },
      { new: true }
    );

    if (!product) throw new HttpError("Product not found", HttpCode.NOT_FOUND);

    if (product.thumbnail?.includes(imageId)) {
      const images = product.images;
      if (images) product.thumbnail = images[0].url;
      else product.thumbnail = "";
      await product.save();
    }

    // removing from cloud storage
    await cloudUploader.destroy(imageId);

    res.json({ message: "Image removed successfully." });
  } catch (error) {
    return next(error);
  }
};

export const getProductDetail: RequestHandler = async (req, res, next) => {
  /*
1. User must be authenticated (optional).
2. Validate the product id.
3. Find Product by the id.
4. Format data.
5. And send the response back.

    */
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      throw new HttpError("Invalid product Id!", HttpCode.UNPROCESSABLE_ENTITY);

    const product = await ProductModel.findById(id).populate<{
      user_id: IUserDocument;
    }>("owner");
    if (!product) throw new HttpError("Product Not Found!", HttpCode.NOT_FOUND);

    res.json({
      product: {
        id: product._id,
        name: product.name,
        description: product.description,
        thumbnail: product.thumbnail,
        category: product.category,
        date: product.purchasingDate,
        price: product.price,
        image: product.images?.map(({ url }) => url),
        seller: {
          id: product.user_id.toString(),
          name: product.user_id.name,
          avatar: product.user_id.avatar?.url,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProductsByCategory: RequestHandler = async (req, res, next) => {
  /*
1. User must be authenticated (optional).
2. Validate the category.
3. Find products by category (apply pagination if needed).
4. Format data.
5. And send the response back.
    */
  try {
    const { category } = req.params;
    const { pageNo = "1", limit = "10" } = req.query as {
      pageNo: string;
      limit: string;
    };
    if (!categories.includes(category))
      throw new HttpError("Invalid category!", HttpCode.UNPROCESSABLE_ENTITY);

    const products = await ProductModel.find({ category })
      .sort("-createdAt")
      .skip((+pageNo - 1) * +limit)
      .limit(+limit);

    const listings = products.map((p) => {
      return {
        id: p._id,
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
  /*
1. User must be authenticated (optional).
2. Find all the products with sorted date (apply limit/pagination if needed).
3. Format data.
4. And send the response back.
    */
  try {
    const products = await ProductModel.find().sort("-createdAt").limit(10);

    const listings = products.map((p) => {
      return {
        id: p._id,
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
  /*
1. User must be authenticated.
2. Find all the products created by this user (apply pagination if needed).
3. Format data.
4. And send the response back.
    */

  const { pageNo = "1", limit = "10" } = req.query as {
    pageNo: string;
    limit: string;
  };
  try {
    const products = await ProductModel.find({ owner: req.user.id })
      .sort("-createdAt")
      .skip((+pageNo - 1) * +limit)
      .limit(+limit);

    const listings = products.map((p) => {
      return {
        id: p._id,
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
