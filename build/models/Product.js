"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
const User_1 = __importDefault(require("./User"));
const categories_1 = __importDefault(require("../lib/categories"));
class Product extends sequelize_1.Model {
    static associate(models) {
        // Many-to-one relationship: Many products can belong to one user
        Product.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'owner',
        });
        // One-to-many relationship: One product can have many assets
        Product.hasMany(models.Asset, {
            foreignKey: 'product_id',
            as: 'assets',
        });
    }
}
Product.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    category: {
        type: sequelize_1.DataTypes.ENUM(...categories_1.default),
        allowNull: false,
    },
    purchasingDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    thumbnail: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "products",
    timestamps: true,
    // Indexes are handled in migrations
});
exports.default = Product;
//# sourceMappingURL=Product.js.map