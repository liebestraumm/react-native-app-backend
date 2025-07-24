import { Document, Schema } from "mongoose";

export interface IAuthVerificationTokenDocument extends Document {
    user_id: Schema.Types.ObjectId;
    token: string;
    createdAt: Date;
  }
