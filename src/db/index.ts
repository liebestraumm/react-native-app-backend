import { Sequelize } from "sequelize";
import "dotenv/config";

let sequelize: Sequelize;

if (process.env.DATABASE_URL) {
  // Production configuration using DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  // Development configuration using individual environment variables
  const DB_NAME = process.env.DB_NAME ?? "";
  const DB_USER = process.env.DB_USER ?? "";
  const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
  const DB_HOST = process.env.DB_HOST ?? "";
  const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}

export { sequelize };

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
    
    // Only sync in development
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log("Database models synchronized successfully.");
    }
  } catch (err: any) {
    console.log("Database connection error:", err.message);
  }
};

connectToDatabase();