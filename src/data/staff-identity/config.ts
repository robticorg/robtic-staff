export const IdentifierStrictness = {
  LONG: "LONG",
  SHORT: "SHORT",
} as const;
export type IdentifierStrictness =
  (typeof IdentifierStrictness)[keyof typeof IdentifierStrictness];

export interface AcceptedIdentifier {
  id: string;
  strictness: IdentifierStrictness;
}

export const ACCEPTED_IDENTIFIERS: readonly AcceptedIdentifier[] = [
  { id: "robtic", strictness: IdentifierStrictness.LONG },
  { id: "rtc", strictness: IdentifierStrictness.SHORT },
  { id: "rc", strictness: IdentifierStrictness.SHORT },
];
