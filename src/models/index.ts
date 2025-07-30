import { Sequelize } from 'sequelize';
import { sequelize } from '../db';

// Import all models
import User from './User';
import Product from './Product';
import AuthVerificationToken from './AuthVerificationToken';
import PasswordResetToken from './PasswordResetToken';
import Asset from './Asset';

// Interface for the database object
interface Database {
  sequelize: Sequelize;
  User: typeof User;
  Product: typeof Product;
  AuthVerificationToken: typeof AuthVerificationToken;
  PasswordResetToken: typeof PasswordResetToken;
  Asset: typeof Asset;
}

// Create db object with all models
const db: Database = {
  sequelize,
  User,
  Product,
  AuthVerificationToken,
  PasswordResetToken,
  Asset
};

// Set up associations for all models
User.associate(db);
Product.associate(db);
Asset.associate(db);
AuthVerificationToken.associate(db);
PasswordResetToken.associate(db);

export default db;
export { User, Product, AuthVerificationToken, PasswordResetToken, Asset}; 