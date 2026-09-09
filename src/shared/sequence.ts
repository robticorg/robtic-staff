import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface Counter {
  _id: string;
  seq: number;
}

export type CounterDocument = HydratedDocument<Counter>;

const counterSchema = new Schema<Counter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: "counters", versionKey: false, _id: false },
);

export const CounterModel: Model<Counter> =
  (mongoose.models.Counter as Model<Counter> | undefined) ??
  mongoose.model<Counter>("Counter", counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const doc = await CounterModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  ).exec();
  return doc.seq;
}
