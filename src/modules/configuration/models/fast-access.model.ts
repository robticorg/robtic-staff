import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { FAST_ACCESS_CONTEXT_VALUES, type FastAccessContext } from "../types/enums.ts";

export interface FastAccess {
  guildId: GuildId;

  command: string;
  message: string;
  contextType: FastAccessContext;
  enabled: boolean;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export type FastAccessDocument = HydratedDocument<FastAccess>;

const fastAccessSchema = new Schema<FastAccess>(
  {
    guildId: { type: String, required: true, index: true },
    command: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
    },
    message: { type: String, required: true, maxlength: 4000 },
    contextType: {
      type: String,
      enum: FAST_ACCESS_CONTEXT_VALUES,
      required: true,
      index: true,
    },
    enabled: { type: Boolean, default: true, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: "fast_access" },
);

fastAccessSchema.index({ guildId: 1, command: 1 }, { unique: true });
fastAccessSchema.index({ guildId: 1, contextType: 1, command: 1 });

export const FastAccessModel: Model<FastAccess> =
  (mongoose.models.FastAccess as Model<FastAccess> | undefined) ??
  mongoose.model<FastAccess>("FastAccess", fastAccessSchema);
