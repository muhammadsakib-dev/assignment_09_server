// Import necessary modules
import app from "./app.js";
import config from "./config/index.js";
import { connectDB } from "./config/db.js";

// Start the server
async function main() {
  try {
    // Connect to database
    await connectDB();

    // Start Express server
    app.listen(config.port, () => {
      console.log(`Server is running on port: ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
