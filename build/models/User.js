"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const bcrypt_1 = require("bcrypt");
const db_1 = require("../db");
class User extends sequelize_1.Model {
    async comparePassword(password) {
        return await (0, bcrypt_1.compare)(password, this.password);
    }
    static associate(models) {
        // One-to-one relationship: One user can have one avatar
        User.hasOne(models.Asset, {
            foreignKey: 'avatarId',
            as: 'avatar',
        });
        // One-to-many relationship: One user can have many products
        User.hasMany(models.Product, {
            foreignKey: 'user_id',
            as: 'products',
        });
        // One-to-many relationship: One user can have many verification tokens
        User.hasMany(models.AuthVerificationToken, {
            foreignKey: 'user_id',
            as: 'verificationTokens',
        });
        // One-to-many relationship: One user can have many password reset tokens
        User.hasMany(models.PasswordResetToken, {
            foreignKey: 'user_id',
            as: 'passwordResetTokens',
        });
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    verified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    tokens: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        defaultValue: [],
    },
    avatarId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'assets',
            key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "users",
    hooks: {
        beforeSave: async (user) => {
            if (user.changed("password")) {
                const salt = await (0, bcrypt_1.genSalt)(10);
                user.password = await (0, bcrypt_1.hash)(user.password, salt);
            }
        },
    },
});
exports.default = User;
//# sourceMappingURL=User.js.map