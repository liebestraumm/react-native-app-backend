import { Model } from "sequelize";

export interface IPasswordResetTokenDocument extends Model {
  id: string;
  user_id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  compareToken: (token: string) => Promise<boolean>;
}
