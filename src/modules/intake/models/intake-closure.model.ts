import mongoose, { Schema, type Model } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";

/** A row means that target is closed; opening it again deletes the row. */
export interface IntakeClosure {
  guildId: GuildId;
  /** `panel:<ticket panel id>` or `dept:<ApplicationDepartment>`. */
  target: string;
  closedBy: UserId;
  closedAt: Date;
  reason?: string | null;
}

const intakeClosureSchema = new Schema<IntakeClosure>(
  {
    guildId: { type: String, required: true },
    target: { type: String, required: true },
    closedBy: { type: String, required: true },
    closedAt: { type: Date, required: true, default: () => new Date() },
    reason: { type: String, trim: true, maxlength: 300, default: null },
  },
  { collection: "intake_closures", versionKey: false },
);

intakeClosureSchema.index({ guildId: 1, target: 1 }, { unique: true });

export const IntakeClosureModel: Model<IntakeClosure> =
  (mongoose.models.IntakeClosure as Model<IntakeClosure> | undefined) ??
  mongoose.model<IntakeClosure>("IntakeClosure", intakeClosureSchema);
