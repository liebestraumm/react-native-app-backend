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
  avatar?: {
    id: string;
    url: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserInstance extends Model<IUserAttributes>, IUserAttributes {
  comparePassword: (password: string) => Promise<boolean>;
  verificationTokens?: any[];
}

class User extends Model<IUserAttributes, Omit<IUserAttributes, 'id'>> implements IUserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public verified!: boolean;
  public tokens!: string[];
  public avatar?: {
    id: string;
    url: string;
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    return await compare(password, this.password);
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
    avatar: {
      type: DataTypes.JSON,
      allowNull: true,
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
