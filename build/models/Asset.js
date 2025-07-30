"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
class Asset extends sequelize_1.Model {
    static associate(models) {
        // One-to-one relationship: One asset can be the avatar of one user
        Asset.belongsTo(models.User, {
            foreignKey: 'avatarId',
            as: 'user',
        });
        // Many-to-one relationship: Many assets can belong to one product
        Asset.belongsTo(models.Product, {
            foreignKey: 'product_id',
            as: 'product',
        });
    }
}
Asset.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    product_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "assets",
    timestamps: true,
});
exports.default = Asset;
//# sourceMappingURL=Asset.js.map