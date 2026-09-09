import { AppError } from "./app-error.ts";
import { ConflictError, DatabaseError, NotFoundError, ValidationError } from "./errors.ts";

export const MONGO_DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === MONGO_DUPLICATE_KEY
  );
}

export function translateMongoError(
  err: unknown,
  fallbackMessage = "Database operation failed",
): AppError {
  if (err instanceof AppError) return err;

  if (isDuplicateKeyError(err)) {
    return new ConflictError("A record with those details already exists.", { mongo: "E11000" });
  }

  const name = (err as { name?: string } | null)?.name;
  if (name === "ValidationError") {
    return new ValidationError("The provided data is invalid.", { mongo: name });
  }
  if (name === "DocumentNotFoundError") {
    return new NotFoundError("record");
  }
  if (name === "CastError") {
    return new ValidationError("An identifier had the wrong format.", { mongo: name });
  }

  return new DatabaseError(fallbackMessage, { mongo: name }, err);
}
