import { Sequelize } from 'sequelize';
import config from '../../config/config.json';

// Import all models
import User from './User';
import Product from './Product';
import AuthVerificationToken from './AuthVerificationToken';
import PasswordResetToken from './PasswordResetToken';
import { HttpError } from './HttpError';

// Environment configuration
const env = (process.env.NODE_ENV || 'development') as keyof typeof config;
const dbConfig = config[env];

// Interface for database configuration
interface DbConfig {
  use_env_variable?: string;
  database: string;
  username: string;
  password: string;
  [key: string]: any;
}

// Interface for the database object
interface Database {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  User: typeof User;
  Product: typeof Product;
  AuthVerificationToken: typeof AuthVerificationToken;
  PasswordResetToken: typeof PasswordResetToken;
  HttpError: typeof HttpError;
  [key: string]: any;
}

// Initialize Sequelize
let sequelize: Sequelize;
sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password || undefined,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect as any,
  }
);

// Create db object with all models
const db: Database = {
  sequelize,
  Sequelize,
  User,
  Product,
  AuthVerificationToken,
  PasswordResetToken,
  HttpError
};

// Set up associations if any model has them
Object.keys(db).forEach((modelName: string) => {
  if (db[modelName] && typeof db[modelName] === 'object' && 'associate' in db[modelName]) {
    (db[modelName] as any).associate(db);
  }
});

export default db;
export { User, Product, AuthVerificationToken, PasswordResetToken, HttpError }; 