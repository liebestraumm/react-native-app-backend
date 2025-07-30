import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db";
import User from "./User";
import categories from "../lib/categories";

export type ProductImage = { url: string; id: string };

export interface IProductAttributes {
  id?: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  purchasingDate: Date;
  images?: ProductImage[];
  thumbnail?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductInstance extends Model<IProductAttributes>, IProductAttributes {
  owner?: any;
}

class Product extends Model<IProductAttributes, Omit<IProductAttributes, 'id'>> implements IProductAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public description!: string;
  public price!: number;
  public category!: string;
  public purchasingDate!: Date;
  public images?: ProductImage[];
  public thumbnail?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    category: {
      type: DataTypes.ENUM(...categories),
      allowNull: false,
    },
    purchasingDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "products",
    timestamps: true,
    // Indexes are handled in migrations
  }
);

// Define the association
Product.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'owner',
});

User.hasMany(Product, {
  foreignKey: 'user_id',
  as: 'products',
});

// Add associate method for better organization
(Product as any).associate = (models: any) => {
  Product.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'owner',
  });
};

export default Product;
