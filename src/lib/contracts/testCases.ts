import type { BatchRunInput } from "@/lib/types";

export type BatchRunRequest = BatchRunInput;

export type TestProvider = BatchRunRequest["provider"];

export interface BatchRunResult {
  testCaseName: string;
  output: string;
  expectedOutput: string | null;
  passed: boolean | null;
  executionTime: number | null;
}
