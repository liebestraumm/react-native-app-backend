import { Document, Schema } from "mongoose";

export interface IPasswordResetTokenDocument extends Document {
    user_id: Schema.Types.ObjectId;
    token: string;
    createdAt: Date;
  }
