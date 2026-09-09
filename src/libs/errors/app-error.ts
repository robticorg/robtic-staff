import { ErrorCategory } from "./categories.ts";

export interface AppErrorOptions {
  category?: ErrorCategory;
  userMessage?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly metadata?: Record<string, unknown>;

  protected explicitUserMessage?: string;

  constructor(
    code: string,
    message: string,
    metadata?: Record<string, unknown>,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.category = options.category ?? ErrorCategory.INTERNAL;
    this.metadata = metadata;
    this.explicitUserMessage = options.userMessage;
    Error.captureStackTrace?.(this, new.target);
  }

  get context(): Record<string, unknown> | undefined {
    return this.metadata;
  }

  get userMessage(): string {
    return this.explicitUserMessage ?? this.message;
  }

  get isUserSafe(): boolean {
    return true;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
