import { rawEnv } from "./env.ts";

export interface AccessConfig {
  botOwnerId: string;
}

export const accessConfig: AccessConfig = {
  botOwnerId: rawEnv.botOwnerId,
};
