import { Sequelize } from "sequelize";
import config from "../sequelize.config";

let sequelize: Sequelize;
// Environment configuration
const dbConfig = config["development"];

sequelize = new Sequelize(
  dbConfig.database ?? "",
  dbConfig.username ?? "",
  dbConfig.password ?? "",
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    logging: false,
  }
);

export { sequelize };

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Only sync in development
    await sequelize.sync({ alter: true });
    console.log("Database models synchronized successfully.");
  } catch (err: any) {
    console.log("Database connection error:", err.message);
  }
};

connectToDatabase();
