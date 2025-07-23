import { Document, Schema } from "mongoose";

export interface IAuthVerificationTokenDocument extends Document {
    owner: Schema.Types.ObjectId;
    token: string;
    createdAt: Date;
  }
