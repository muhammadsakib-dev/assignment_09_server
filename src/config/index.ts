// Import necessary modules
import dotenv from "dotenv";
dotenv.config();

// Configeration Type Setup
export interface Config {
  port: number;
  authSecret: string;
  clientUrl: string;
  serverUrl: string;
  mongoUri: string;
  dbName: string;
}

// Configuration values -- store value from environment variables
export const config: Config = {
  port: Number(process.env.PORT),
  authSecret: process.env.BETTER_AUTH_SECRET as string,
  clientUrl: process.env.BETTER_AUTH_URL as string,
  serverUrl: process.env.API_BASE_URL as string,
  mongoUri: process.env.MONGODB_URI as string,
  dbName: process.env.DB_NAME as string
};

export default config;
