/**
 * Shared fee constants and row shapes.
 *
 * Kept out of the actions module because a "use server" file may only export
 * async functions — exporting a const array from it breaks the build at the
 * page-data collection step.
 */

export const FEE_FREQUENCIES = ["ONE_TIME", "ANNUAL", "QUARTERLY", "MONTHLY"] as const;

export type FeeFrequency = (typeof FEE_FREQUENCIES)[number];

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
