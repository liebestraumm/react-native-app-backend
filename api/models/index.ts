import { Sequelize } from 'sequelize';
import { sequelize } from '../db';

// Import all models
import User from './User';
import Product from './Product';
import AuthVerificationToken from './AuthVerificationToken';
import PasswordResetToken from './PasswordResetToken';
import Asset from './Asset';
import { Conversation, Chat } from './Conversation';

// Interface for the database object
interface Database {
  sequelize: Sequelize;
  User: typeof User;
  Product: typeof Product;
  AuthVerificationToken: typeof AuthVerificationToken;
  PasswordResetToken: typeof PasswordResetToken;
  Asset: typeof Asset;
  Conversation: typeof Conversation;
  Chat: typeof Chat;
}

// Create db object with all models
const db: Database = {
  sequelize,
  User,
  Product,
  AuthVerificationToken,
  PasswordResetToken,
  Asset,
  Conversation,
  Chat
};

// Set up associations for all models
User.associate(db);
Product.associate(db);
Asset.associate(db);
AuthVerificationToken.associate(db);
PasswordResetToken.associate(db);
Conversation.associate(db);
Chat.associate(db);

export default db;
export { User, Product, AuthVerificationToken, PasswordResetToken, Asset, Conversation, Chat }; 