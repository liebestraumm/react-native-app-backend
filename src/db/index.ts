import { Sequelize } from "sequelize";
import envs from "../env";
import config from "../sequelize.config";

let sequelize: Sequelize;
// Environment configuration
const env = (envs.NODE_ENV || "development") as keyof typeof config;
const dbConfig = config[env];

if (envs.NODE_ENV === "production") {
  console.log("Using production database");
  sequelize = new Sequelize(dbConfig.production_db ?? "", {
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    logging: false,
  });
} else {
  console.log("Using development database");
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
}

export { sequelize };

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Only sync in development
    if (envs.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("Database models synchronized successfully.");
    }
  } catch (err: any) {
    console.log("Database connection error:", err.message);
  }
};

connectToDatabase();
