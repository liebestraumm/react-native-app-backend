"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const env_1 = __importDefault(require("../env"));
const sequelize_config_1 = __importDefault(require("../sequelize.config"));
let sequelize;
// Environment configuration
const env = (env_1.default.NODE_ENV || "development");
const dbConfig = sequelize_config_1.default[env];
if (env_1.default.NODE_ENV === "production") {
    console.log("Using production database");
    exports.sequelize = sequelize = new sequelize_1.Sequelize(dbConfig.production_db ?? "", {
        dialect: dbConfig.dialect,
        dialectOptions: dbConfig.dialectOptions,
        logging: false,
    });
}
else {
    console.log("Using development database");
    exports.sequelize = sequelize = new sequelize_1.Sequelize(dbConfig.database ?? "", dbConfig.username ?? "", dbConfig.password ?? "", {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        dialectOptions: dbConfig.dialectOptions,
        logging: false,
    });
}
const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connection has been established successfully.");
        // Only sync in development
        if (env_1.default.NODE_ENV !== "production") {
            await sequelize.sync({ alter: true });
            console.log("Database models synchronized successfully.");
        }
    }
    catch (err) {
        console.log("Database connection error:", err.message);
    }
};
connectToDatabase();
//# sourceMappingURL=index.js.map