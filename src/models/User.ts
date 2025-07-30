import { Model, DataTypes } from "sequelize";
import { hash, compare, genSalt } from "bcrypt";
import { sequelize } from "../db";

export interface IUserAttributes {
  id?: string;
  email: string;
  password: string;
  name: string;
  verified: boolean;
  tokens: string[];
  avatarId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserInstance extends Model<IUserAttributes>, IUserAttributes {
  comparePassword: (password: string) => Promise<boolean>;
  verificationTokens?: any[];
  passwordResetTokens?: any[];
  products?: any[];
  avatar?: any;
}

class User extends Model<IUserAttributes, Omit<IUserAttributes, 'id'>> implements IUserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public verified!: boolean;
  public tokens!: string[];
  public avatarId?: string;
  public avatar?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    return await compare(password, this.password);
  }

  public static associate(models: any) {
    // One-to-one relationship: One user can have one avatar
    User.belongsTo(models.Asset, {
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

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    tokens: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    avatarId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'assets',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: "users",
    hooks: {
      beforeSave: async (user: User) => {
        if (user.changed("password")) {
          const salt = await genSalt(10);
          user.password = await hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
