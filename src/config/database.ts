import { rawEnv } from "./env.ts";

export interface DatabaseConfig {
  uri: string;
  dbName: string;
}

export const databaseConfig: DatabaseConfig = {
  uri: rawEnv.mongoUri,
  dbName: rawEnv.mongoDbName,
};
