import type { Snowflake } from "discord.js";
import type { Types } from "mongoose";

export type DiscordId = Snowflake;

export type GuildId = DiscordId;

export type UserId = DiscordId;

export type ChannelId = DiscordId;

export type RoleId = DiscordId;

export type IdLike = string | Types.ObjectId;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export type MongoFilter<_T = unknown> = Record<string, unknown>;

export type MongoUpdate<_T = unknown> = Record<string, unknown>;

export interface ListOptions {
  limit?: number;
  skip?: number;

  since?: Date;

  until?: Date;

  sort?: 1 | -1;
}
