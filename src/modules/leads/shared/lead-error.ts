import { DomainError } from "../../../shared/utils/errors.ts";

export class LeadError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}
