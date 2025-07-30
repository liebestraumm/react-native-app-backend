import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db";

export interface IAssetAttributes {
  id?: string;
  url: string;
  product_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAssetInstance extends Model<IAssetAttributes>, IAssetAttributes {
  user?: any;
  product?: any;
}

class Asset extends Model<IAssetAttributes, Omit<IAssetAttributes, 'id'>> implements IAssetAttributes {
  public id!: string;
  public url!: string;
  public product_id?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any) {
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

Asset.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: "assets",
    timestamps: true,
  }
);

export default Asset; 