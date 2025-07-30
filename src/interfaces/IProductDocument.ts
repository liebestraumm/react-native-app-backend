import { Model } from "sequelize";

export type ProductImage = { url: string; id: string };

export interface IProductDocument extends Model {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  purchasingDate: Date;
  images?: ProductImage[];
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}