import "dotenv/config";

const envs = {
  VERIFICATION_LINK: String(process.env.VERIFICATION_LINK),
  PASSWORD_RESET_LINK: String(process.env.PASSWORD_RESET_LINK),
  MAILTRAP_API_TOKEN: String(process.env.MAILTRAP_API_TOKEN),
  MAILTRAP_HOST: String(process.env.MAILTRAP_HOST),
  MAILTRAP_USER: String(process.env.MAILTRAP_USER),
  MAILTRAP_PASS: String(process.env.MAILTRAP_PASS),
  MAILTRAP_SENDER: String(process.env.MAILTRAP_SENDER),
  JWT_SECRET: String(process.env.JWT_SECRET),
  CLOUD_NAME: String(process.env.CLOUD_NAME),
  CLOUD_KEY: String(process.env.CLOUD_KEY),
  CLOUD_SECRET: String(process.env.CLOUD_SECRET),
  DB_NAME: String(process.env.DB_NAME),
  DB_USER: String(process.env.DB_USER),
  DB_PASSWORD: String(process.env.DB_PASSWORD),
  DB_HOST: String(process.env.DB_HOST),
  DB_PORT: Number(process.env.DB_PORT),
  DATABASE_URL: String(process.env.DATABASE_URL),
  NODE_ENV: String(process.env.NODE_ENV),
  PORT: Number(process.env.PORT),
}

export default envs;