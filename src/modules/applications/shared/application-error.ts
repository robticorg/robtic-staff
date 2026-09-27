import { DomainError } from "../../../shared/utils/errors.ts";

export class ApplicationError extends DomainError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
  }
}
