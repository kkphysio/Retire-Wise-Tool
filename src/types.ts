export interface CalculatorState {
  equityAllocation: number;
  debtAllocation: number;
  otherAllocation: number;
  equityReturn: number;
  debtReturn: number;
  otherReturn: number;
  retirementAge: number;
  yearsInRetirement: number;
  currentCorpus: number;
  monthlyWithdrawalAmount: number;
  withdrawalRate: number;
  withdrawalMode: 'amount' | 'rate';
  inflationRate: number;
  currentAge: number;
}

export interface YearData {
  year: number;
  age: number;
  startingPortfolio: number;
  annualWithdrawal: number;
  portfolioGrowth: number;
  endingPortfolio: number;
  noSipPortfolio: number;
}
