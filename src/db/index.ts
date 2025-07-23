import { connect } from "mongoose";
import "dotenv/config";

const connectToDatabase = async () => {
  try {
    await connect(process.env.DB_HOST ?? "");
    console.log("db connected successfully.");
  } catch (err: any) {
    console.log("db connection error: ", err.message);
  }
};

connectToDatabase();