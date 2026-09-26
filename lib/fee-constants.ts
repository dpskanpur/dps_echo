/**
 * Shared fee constants and row shapes.
 *
 * Kept out of the actions module because a "use server" file may only export
 * async functions — exporting a const array from it breaks the build at the
 * page-data collection step.
 */

export const FEE_FREQUENCIES = ["ANNUAL", "SEMI_ANNUAL", "QUARTERLY", "CUSTOM"] as const;

export type FeeFrequency = (typeof FEE_FREQUENCIES)[number] | "ONE_TIME" | "MONTHLY";

export const FEE_FREQUENCY_LABELS: Record<string, string> = {
  ANNUAL: "Annual / One time",
  SEMI_ANNUAL: "Semi Annual",
  QUARTERLY: "Quarterly",
  CUSTOM: "Custom (Part Payment)",
  ONE_TIME: "Annual / One time",
  MONTHLY: "Monthly",
};

export interface FeeStructureImportRow {
  className: string;
  feeHeadCode: string;
  amount: string | number;
  frequency?: string;
}

export interface FeeImportResult {
  success: boolean;
  applied: number;
  errors: string[];
}
