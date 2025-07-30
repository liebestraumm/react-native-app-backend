import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db";
import User from "./User";
import Asset from "./Asset";
import categories from "../lib/categories";

export interface IProductAttributes {
  id?: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  purchasingDate: Date;
  thumbnail?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductInstance extends Model<IProductAttributes>, IProductAttributes {
  owner?: any;
  assets?: Asset[];
}

class Product extends Model<IProductAttributes, Omit<IProductAttributes, 'id'>> implements IProductAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public description!: string;
  public price!: number;
  public category!: string;
  public purchasingDate!: Date;
  public thumbnail?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Add assets property for TypeScript
  public assets?: Asset[];

  public static associate(models: any) {
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

export default Product;
