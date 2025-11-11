import dotenv from "dotenv";

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT || 27017,
  DB_NAME: process.env.DB_NAME || "ops_suite_db",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

export default config;
