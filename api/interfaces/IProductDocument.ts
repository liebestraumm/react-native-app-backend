import { Model } from "sequelize";

export interface IProductDocument extends Model {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  purchasingDate: Date;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}