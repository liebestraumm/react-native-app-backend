"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const bcrypt_1 = require("bcrypt");
const db_1 = require("../db");
const User_1 = __importDefault(require("./User"));
class PasswordResetToken extends sequelize_1.Model {
    async compareToken(token) {
        return await (0, bcrypt_1.compare)(token, this.token);
    }
    static associate(models) {
        // Many-to-one relationship: Many password reset tokens can belong to one user
        PasswordResetToken.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    }
}
PasswordResetToken.init({
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
    token: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "password_reset_tokens",
    timestamps: true,
    hooks: {
        beforeSave: async (resetToken) => {
            if (resetToken.changed("token")) {
                const salt = await (0, bcrypt_1.genSalt)(10);
                resetToken.token = await (0, bcrypt_1.hash)(resetToken.token, salt);
            }
        },
    },
    // Indexes are handled in migrations
});
exports.default = PasswordResetToken;
//# sourceMappingURL=PasswordResetToken.js.map