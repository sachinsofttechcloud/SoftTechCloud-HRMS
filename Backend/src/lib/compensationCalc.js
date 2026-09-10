const LPA_THRESHOLD = 1_200_000;
const PF_RATE = 0.12;
const BASIC_RATIO = 0.4;
const HRA_RATIO_OF_BASIC = 0.5;
const PT_MONTHLY_BELOW_12L = 200;
const STANDARD_DEDUCTION = 75_000;

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * New tax regime slabs (FY 2025-26) + 4% health & education cess.
 * Applied only when annual CTC is above ₹12 LPA.
 */
function calculateIncomeTax(annualCtc) {
  const taxable = Math.max(0, annualCtc - STANDARD_DEDUCTION);
  const slabs = [
    { upTo: 400_000, rate: 0 },
    { upTo: 800_000, rate: 0.05 },
    { upTo: 1_200_000, rate: 0.1 },
    { upTo: 1_600_000, rate: 0.15 },
    { upTo: 2_000_000, rate: 0.2 },
    { upTo: 2_400_000, rate: 0.25 },
    { upTo: Infinity, rate: 0.3 },
  ];

  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxable <= prev) break;
    const inSlab = Math.min(taxable, slab.upTo) - prev;
    tax += inSlab * slab.rate;
    prev = slab.upTo;
  }

  return round2(tax + tax * 0.04);
}

/**
 * Build full CTC breakup from annual CTC + optional variable pay.
 *
 * Monthly in-hand:
 *   monthlySalary = total CTC / 12
 *   inHand = monthlySalary - monthly PF - government tax
 *   (₹200/month if CTC ≤ ₹12 LPA, otherwise monthly income tax)
 *
 * PF: 12% of basic (basic = 40% of CTC), statutory wage cap ₹15,000/month
 */
export function computeCompensationBreakdown({ totalCtc, variablePay = 0 }) {
  const annualCtc = round2(totalCtc);
  const annualVariable = round2(variablePay);

  if (!annualCtc || annualCtc <= 0) {
    throw new Error("Total CTC must be a positive amount.");
  }
  if (annualVariable < 0) {
    throw new Error("Variable pay cannot be negative.");
  }
  if (annualVariable > annualCtc) {
    throw new Error("Variable pay cannot exceed total CTC.");
  }

  const monthlySalary = round2(annualCtc / 12);
  const basicSalary = round2(annualCtc * BASIC_RATIO);
  const hra = round2(basicSalary * HRA_RATIO_OF_BASIC);

  const monthlyBasic = basicSalary / 12;
  const pfWageMonthly = Math.min(monthlyBasic, 15_000);
  const pfDeductionMonthly = round2(pfWageMonthly * PF_RATE);
  const pfDeduction = round2(pfDeductionMonthly * 12);
  const employerPf = pfDeduction;

  const specialAllowance = round2(Math.max(0, annualCtc - basicSalary - hra - employerPf));
  const isAbove12Lpa = annualCtc > LPA_THRESHOLD;

  let governmentTax = 0;
  let professionalTaxMonthly = 0;
  let monthlyGovernmentTax = 0;
  let taxBracket = "BELOW_12_LPA";
  let taxNote = "";

  if (isAbove12Lpa) {
    taxBracket = "ABOVE_12_LPA";
    governmentTax = calculateIncomeTax(annualCtc);
    monthlyGovernmentTax = round2(governmentTax / 12);
    taxNote =
      "Monthly salary is CTC ÷ 12. In-hand = monthly salary − PF − government income tax (above ₹12 LPA).";
  } else {
    professionalTaxMonthly = PT_MONTHLY_BELOW_12L;
    monthlyGovernmentTax = PT_MONTHLY_BELOW_12L;
    governmentTax = round2(PT_MONTHLY_BELOW_12L * 12);
    taxNote =
      "Monthly salary is CTC ÷ 12. In-hand = monthly salary − PF − ₹200 government tax (CTC is ₹12 LPA or below).";
  }

  const monthlyInHand = round2(monthlySalary - pfDeductionMonthly - monthlyGovernmentTax);
  const inHandCtc = round2(monthlyInHand * 12);

  return {
    totalCtc: annualCtc,
    basicSalary,
    hra,
    specialAllowance,
    variablePay: annualVariable,
    pfDeduction,
    employerPf,
    governmentTax,
    professionalTaxMonthly,
    inHandCtc,
    monthlyInHand,
    monthlyGross: monthlySalary,
    monthlySalary,
    taxBracket,
    taxNote,
    pfDeductionMonthly,
    monthlyBasic: round2(monthlyBasic),
    monthlyHra: round2(hra / 12),
    monthlySpecialAllowance: round2(specialAllowance / 12),
    monthlyGovernmentTax,
    lpaThreshold: LPA_THRESHOLD,
  };
}

export { LPA_THRESHOLD };
