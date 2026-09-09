import { AppError } from "./app-error.ts";
import { ErrorCategory, GENERIC_USER_MESSAGE } from "./categories.ts";

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, metadata, { category: ErrorCategory.VALIDATION });
  }
}

export class PermissionError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super("PERMISSION_DENIED", message, metadata, { category: ErrorCategory.PERMISSION });
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, metadata?: Record<string, unknown>) {
    super(`${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found`, metadata, {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super("CONFLICT", message, metadata, { category: ErrorCategory.CONFLICT });
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super("CONFIGURATION_ERROR", message, metadata, { category: ErrorCategory.CONFIGURATION });
  }
}

class HiddenDetailError extends AppError {
  override get userMessage(): string {
    return this.explicitUserMessage ?? GENERIC_USER_MESSAGE;
  }

  override get isUserSafe(): boolean {
    return Boolean(this.explicitUserMessage);
  }
}

export class DatabaseError extends HiddenDetailError {
  constructor(message: string, metadata?: Record<string, unknown>, cause?: unknown) {
    super("DATABASE_ERROR", message, metadata, { category: ErrorCategory.DATABASE, cause });
  }
}

export class DiscordError extends HiddenDetailError {
  constructor(message: string, metadata?: Record<string, unknown>, cause?: unknown) {
    super("DISCORD_ERROR", message, metadata, { category: ErrorCategory.DISCORD, cause });
  }
}

export class InternalError extends HiddenDetailError {
  constructor(message: string, metadata?: Record<string, unknown>, cause?: unknown) {
    super("INTERNAL_ERROR", message, metadata, { category: ErrorCategory.INTERNAL, cause });
  }
}
