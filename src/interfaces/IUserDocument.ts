import { Document } from "mongoose";

export interface IUserDocument extends Document {
    email: string;
    password: string;
    name: string;
    verified: boolean
  }