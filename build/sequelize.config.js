"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = __importDefault(require("./env"));
const config = {
    development: {
        username: env_1.default.DB_USER,
        password: env_1.default.DB_PASSWORD,
        database: env_1.default.DB_NAME,
        host: env_1.default.DB_HOST,
        dialect: "postgres",
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    },
    test: {
        dialect: "postgres",
        test_db: "TEST_DATABASE_URL"
    },
    production: {
        dialect: "postgres",
        production_db: env_1.default.DATABASE_URL,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
};
exports.default = config;
//# sourceMappingURL=sequelize.config.js.map