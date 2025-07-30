import { Model, DataTypes } from "sequelize";
import { hash, compare, genSalt } from "bcrypt";
import { sequelize } from "../db";
import User from "./User";

export interface IAuthVerificationTokenAttributes {
  id?: string;
  user_id: string;
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthVerificationTokenInstance extends Model<IAuthVerificationTokenAttributes>, IAuthVerificationTokenAttributes {
  compareToken: (token: string) => Promise<boolean>;
}

class AuthVerificationToken extends Model<IAuthVerificationTokenAttributes, Omit<IAuthVerificationTokenAttributes, 'id'>> implements IAuthVerificationTokenAttributes {
  public id!: string;
  public user_id!: string;
  public token!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async compareToken(token: string): Promise<boolean> {
    return await compare(token, this.token);
  }
}

AuthVerificationToken.init(
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
    tableName: "auth_verification_tokens",
    timestamps: true,
    hooks: {
      beforeSave: async (authToken: AuthVerificationToken) => {
        if (authToken.changed("token")) {
          const salt = await genSalt(10);
          authToken.token = await hash(authToken.token, salt);
        }
      },
    },
    // Indexes are handled in migrations
  }
);

// Define the association
AuthVerificationToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(AuthVerificationToken, {
  foreignKey: 'user_id',
  as: 'verificationTokens',
});

// Add associate method for better organization
(AuthVerificationToken as any).associate = (models: any) => {
  AuthVerificationToken.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
  });
};

export default AuthVerificationToken;