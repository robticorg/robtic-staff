import type { HydratedDocument, Model, ProjectionType, UpdateQuery } from "mongoose";
import type { IdLike, ListOptions, MongoFilter } from "../types/index.ts";
import { toObjectId } from "../utils/id.ts";

export abstract class BaseRepository<TDoc> {
  protected constructor(public readonly model: Model<TDoc>) {}

  insert(data: Partial<TDoc>): Promise<HydratedDocument<TDoc>> {
    return this.model.create(data as TDoc) as unknown as Promise<HydratedDocument<TDoc>>;
  }

  findById(
    id: IdLike,
    projection?: ProjectionType<TDoc>,
  ): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findById(toObjectId(id), projection).exec();
  }

  findOne(
    filter: MongoFilter<TDoc>,
    projection?: ProjectionType<TDoc>,
  ): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findOne(filter as never, projection).exec();
  }

  find(
    filter: MongoFilter<TDoc>,
    options: ListOptions = {},
  ): Promise<HydratedDocument<TDoc>[]> {
    const query = this.model.find(withCreatedAtWindow(filter, options) as never);
    query.sort({ createdAt: options.sort ?? -1 });
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    return query.exec();
  }

  updateById(
    id: IdLike,
    update: UpdateQuery<TDoc>,
    options: Record<string, unknown> = {},
  ): Promise<HydratedDocument<TDoc> | null> {
    return this.model
      .findByIdAndUpdate(toObjectId(id), update, { returnDocument: "after", ...options })
      .exec();
  }

  updateOne(
    filter: MongoFilter<TDoc>,
    update: UpdateQuery<TDoc>,
    options: Record<string, unknown> = {},
  ): Promise<HydratedDocument<TDoc> | null> {
    return this.model
      .findOneAndUpdate(filter as never, update, { returnDocument: "after", ...options })
      .exec();
  }

  deleteById(id: IdLike): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findByIdAndDelete(toObjectId(id)).exec();
  }

  count(filter: MongoFilter<TDoc> = {}): Promise<number> {
    return this.model.countDocuments(filter as never).exec();
  }

  exists(filter: MongoFilter<TDoc>): Promise<boolean> {
    return this.model
      .exists(filter as never)
      .exec()
      .then((r) => r !== null);
  }
}

function withCreatedAtWindow(
  filter: Record<string, unknown>,
  options: ListOptions,
): Record<string, unknown> {
  if (!options.since && !options.until) return filter;
  const createdAt: Record<string, Date> = {};
  if (options.since) createdAt.$gte = options.since;
  if (options.until) createdAt.$lt = options.until;
  return { ...filter, createdAt };
}
