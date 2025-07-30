import { Model, DataTypes } from "sequelize";
import { hash, compare, genSalt } from "bcrypt";
import { sequelize } from "../db";
import User from "./User";

export interface IPasswordResetTokenAttributes {
  id?: string;
  user_id: string;
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPasswordResetTokenInstance extends Model<IPasswordResetTokenAttributes>, IPasswordResetTokenAttributes {
  compareToken: (token: string) => Promise<boolean>;
}

class PasswordResetToken extends Model<IPasswordResetTokenAttributes, Omit<IPasswordResetTokenAttributes, 'id'>> implements IPasswordResetTokenAttributes {
  public id!: string;
  public user_id!: string;
  public token!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async compareToken(token: string): Promise<boolean> {
    return await compare(token, this.token);
  }
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "password_reset_tokens",
    timestamps: true,
    hooks: {
      beforeSave: async (resetToken: PasswordResetToken) => {
        if (resetToken.changed("token")) {
          const salt = await genSalt(10);
          resetToken.token = await hash(resetToken.token, salt);
        }
      },
    },
    // Indexes are handled in migrations
  }
);

// Define the association
PasswordResetToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(PasswordResetToken, {
  foreignKey: 'user_id',
  as: 'passwordResetTokens',
});

// Add associate method for better organization
(PasswordResetToken as any).associate = (models: any) => {
  PasswordResetToken.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
  });
};

export default PasswordResetToken;
