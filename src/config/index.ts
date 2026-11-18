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
  port: Number(process.env.PORT) || 8000,
  authSecret: process.env.BETTER_AUTH_SECRET || "",
  clientUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  serverUrl: process.env.API_BASE_URL || "http://localhost:8000",
  mongoUri: process.env.MONGODB_URI || "",
  dbName: process.env.DB_NAME || "WedPlan",
};

export default config;
