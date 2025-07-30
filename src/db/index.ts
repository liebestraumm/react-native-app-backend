import { Sequelize } from "sequelize";
import "dotenv/config";

const DB_NAME = process.env.DB_NAME ?? "";
const DB_USER = process.env.DB_USER ?? "";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_HOST = process.env.DB_HOST ?? "";
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true
    }
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
    
    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log("Database models synchronized successfully.");
  } catch (err: any) {
    console.log("Database connection error:", err.message);
  }
};

connectToDatabase();