export { AppError, isAppError, type AppErrorOptions } from "./app-error.ts";
export { ErrorCategory, GENERIC_USER_MESSAGE } from "./categories.ts";
export {
  ValidationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  ConfigurationError,
  DatabaseError,
  DiscordError,
  InternalError,
} from "./errors.ts";
export {
  MONGO_DUPLICATE_KEY,
  isDuplicateKeyError,
  translateMongoError,
} from "./mongo-error.ts";
export { toUserMessage, toLogContext } from "./to-user-message.ts";

export { AppError as DomainError } from "./app-error.ts";
