export type PricingInput = {
  monthlyUsageKwh: number;
  utilityRatePerKwh: number;
  solarOffsetPercent: number;
};

export type PricingOutput = {
  baselineMonthlyCost: number;
  projectedMonthlyCost: number;
  estimatedMonthlySavings: number;
};

export function calculatePricing(input: PricingInput): PricingOutput {
  const baselineMonthlyCost = input.monthlyUsageKwh * input.utilityRatePerKwh;
  const projectedMonthlyCost =
    baselineMonthlyCost * (1 - input.solarOffsetPercent / 100);
  const estimatedMonthlySavings = baselineMonthlyCost - projectedMonthlyCost;

  return {
    baselineMonthlyCost,
    projectedMonthlyCost,
    estimatedMonthlySavings,
  };
}
