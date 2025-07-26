import { Document, Schema } from "mongoose";

export type productImage = { url: string; id: string };
export interface IProductDocument extends Document {
  user_id: Schema.Types.ObjectId;
  name: string;
  price: number;
  purchasingDate: Date;
  category: string;
  images?: productImage[];
  thumbnail?: string;
  description: string;
}