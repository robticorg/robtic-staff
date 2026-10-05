import { responsibilityApplyMessages } from "../../../data/tickets/responsibility-apply.ts";
import type { TicketAnswer } from "../models/ticket.model.ts";

const A = responsibilityApplyMessages.answers;

export interface ResponsibilityApplication {
  responsibilityTitle: string;
  explain: string;
  job: string;
  situation: string;
  committed: boolean;
}

export type ApplicationProblem = "NOT_COMMITTED" | "MISSING_FIELDS";

export function validateApplication(input: ResponsibilityApplication): ApplicationProblem | null {
  if (!input.explain.trim() || !input.job.trim() || !input.situation.trim()) return "MISSING_FIELDS";
  if (!input.committed) return "NOT_COMMITTED";
  return null;
}

export function applicationAnswers(input: ResponsibilityApplication): TicketAnswer[] {
  return [
    { questionId: "responsibility", question: A.responsibility, answer: input.responsibilityTitle },
    { questionId: "explain", question: A.explain, answer: input.explain.trim() },
    { questionId: "job", question: A.job, answer: input.job.trim() },
    { questionId: "situation", question: A.situation, answer: input.situation.trim() },
    { questionId: "commit", question: A.commit, answer: A.committed },
  ];
}
