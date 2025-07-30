"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Asset = exports.PasswordResetToken = exports.AuthVerificationToken = exports.Product = exports.User = void 0;
const db_1 = require("../db");
// Import all models
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Product_1 = __importDefault(require("./Product"));
exports.Product = Product_1.default;
const AuthVerificationToken_1 = __importDefault(require("./AuthVerificationToken"));
exports.AuthVerificationToken = AuthVerificationToken_1.default;
const PasswordResetToken_1 = __importDefault(require("./PasswordResetToken"));
exports.PasswordResetToken = PasswordResetToken_1.default;
const Asset_1 = __importDefault(require("./Asset"));
exports.Asset = Asset_1.default;
// Create db object with all models
const db = {
    sequelize: db_1.sequelize,
    User: User_1.default,
    Product: Product_1.default,
    AuthVerificationToken: AuthVerificationToken_1.default,
    PasswordResetToken: PasswordResetToken_1.default,
    Asset: Asset_1.default
};
// Set up associations for all models
User_1.default.associate(db);
Product_1.default.associate(db);
Asset_1.default.associate(db);
AuthVerificationToken_1.default.associate(db);
PasswordResetToken_1.default.associate(db);
exports.default = db;
//# sourceMappingURL=index.js.map