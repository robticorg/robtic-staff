import mongoose from "mongoose";
import { config } from "../config/index.ts";
import { logger } from "../shared/utils/logger.ts";

const log = logger.child("database");

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => log.info("MongoDB connected"));
  mongoose.connection.on("disconnected", () => log.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (err) => log.error("MongoDB error", err));

  connectionPromise = mongoose
    .connect(config.mongoUri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

export async function disconnectDatabase(): Promise<void> {
  if (!connectionPromise) return;
  await mongoose.disconnect();
  connectionPromise = null;
  log.info("MongoDB connection closed");
}

export { mongoose };
