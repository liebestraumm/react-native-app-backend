import { Document } from "mongoose";

export interface IUserDocument extends Document {
    email: string;
    password: string;
    name: string;
    verified: boolean,
    tokens: Array<string>,
    avatar?: {
      id: string
      url: string
    }
  }