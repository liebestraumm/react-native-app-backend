import { model, Schema } from "mongoose";
import categories from "../lib/categories";
import { IProductDocument } from "../interfaces/IProductDocument";

const productSchema = new Schema<IProductDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: [...categories],
      required: true,
    },
    purchasingDate: {
      type: Date,
      required: true,
    },
    images: [
      {
        type: Object,
        url: String,
        id: String,
      },
    ],
    thumbnail: String,
  },
  { timestamps: true }
);

const ProductModel = model("Product", productSchema);

export default ProductModel;
