import { CalculatorState } from "./types";

export const DEFAULT_STATE: CalculatorState = {
  equityAllocation: 60,
  debtAllocation: 30,
  otherAllocation: 10,
  equityReturn: 12.0,
  debtReturn: 7.0,
  otherReturn: 5.0,
  retirementAge: 60,
  yearsInRetirement: 30,
  currentCorpus: 1000000,
  monthlyWithdrawalAmount: 40000,
  withdrawalRate: 4,
  withdrawalMode: 'amount',
  inflationRate: 6.0,
  currentAge: 30,
};
