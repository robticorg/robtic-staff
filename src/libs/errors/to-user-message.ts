import { AppError } from "./app-error.ts";
import { GENERIC_USER_MESSAGE } from "./categories.ts";

export function toUserMessage(err: unknown, fallback: string = GENERIC_USER_MESSAGE): string {
  if (err instanceof AppError) return err.userMessage;
  return fallback;
}

export function toLogContext(err: unknown): Record<string, unknown> {
  if (err instanceof AppError) {
    return {
      name: err.name,
      code: err.code,
      category: err.category,
      metadata: err.metadata,
    };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { value: String(err) };
}
