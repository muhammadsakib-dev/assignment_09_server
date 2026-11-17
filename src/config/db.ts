// Import necessary modules
import { MongoClient, type Db } from "mongodb";
import config from "./index.js";

// Database connection variables
let client: MongoClient | null = null;
let db: Db | null = null;

// Connect to MongoDB database
export async function connectDB(): Promise<Db> {
  try {
    if (db) return db;

    client = new MongoClient(config.mongoUri);

    await client.connect();

    db = client.db(config.dbName);

    // Check database connection
    await db.command({ ping: 1 });

    console.log("MongoDB connected successfully");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

// Call Database connection
export function getDB(): Db {
  if (!db) {
    throw new Error("Database is not connected. Call connectDB() first.");
  }

  return db;
}

// Close the database connection
export async function closeDB(): Promise<void> {
  if (!client) return;

  await client.close();

  client = null;
  db = null;

  console.log("MongoDB connection closed");
}
