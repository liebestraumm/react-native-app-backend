import { Dialect } from 'sequelize';
import envs from './env';

interface DatabaseConfig {
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  dialect: Dialect;
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
  test_db?: string;
  production_db?: string;
}

interface Config {
  [key: string]: DatabaseConfig;
}

const config: Config = {
  development: {
    username: envs.DB_USER,
    password: envs.DB_PASSWORD,
    database: envs.DB_NAME,
    host: envs.DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
  test: {
    dialect: "postgres",
    test_db: "TEST_DATABASE_URL"
  },
  production: {
    dialect: "postgres",
    production_db: envs.DATABASE_URL,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

export default config; 