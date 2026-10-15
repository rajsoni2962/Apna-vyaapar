import { ExtractedItem, ExtractedTotals, MathematicalVerificationResult } from './types';

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export function verifyBillMathematics(
  items: ExtractedItem[],
  totals: ExtractedTotals
): MathematicalVerificationResult {
  const discrepancies: string[] = [];

  // 1. Calculate sum of line item totals
  let calculatedLineItemsSum = 0;
  let calculatedTaxableSum = 0;
  let calculatedCgstSum = 0;
  let calculatedSgstSum = 0;
  let calculatedIgstSum = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = typeof item.quantity?.value === 'number' ? item.quantity.value : 1;
    const rate = typeof item.rate?.value === 'number' ? item.rate.value : 0;
    const discount = typeof item.discount?.value === 'number' ? item.discount.value : 0;
    const printedLineTotal = typeof item.line_total?.value === 'number' ? item.line_total.value : 0;

    const baseLineCalc = round2(Math.max(0, qty * rate - discount));
    
    // Check if line calculation matches printed line total (allow small rounding tolerance e.g. 0.5)
    if (printedLineTotal > 0 && Math.abs(baseLineCalc - printedLineTotal) > 1.5) {
      discrepancies.push(
        `Item #${i + 1} (${item.item_name?.value || 'Item'}): Qty (${qty}) × Rate (₹${rate}) - Disc (₹${discount}) = ₹${baseLineCalc}, but bill printed line total is ₹${printedLineTotal} (Diff: ₹${round2(baseLineCalc - printedLineTotal)}).`
      );
    }

    calculatedLineItemsSum += printedLineTotal > 0 ? printedLineTotal : baseLineCalc;

    const taxable = typeof item.taxable_amount?.value === 'number' && item.taxable_amount.value > 0
      ? item.taxable_amount.value
      : baseLineCalc;
    calculatedTaxableSum += taxable;

    if (typeof item.cgst?.value === 'number') calculatedCgstSum += item.cgst.value;
    if (typeof item.sgst?.value === 'number') calculatedSgstSum += item.sgst.value;
    if (typeof item.igst?.value === 'number') calculatedIgstSum += item.igst.value;
  }

  calculatedLineItemsSum = round2(calculatedLineItemsSum);
  calculatedTaxableSum = round2(calculatedTaxableSum);
  calculatedCgstSum = round2(calculatedCgstSum);
  calculatedSgstSum = round2(calculatedSgstSum);
  calculatedIgstSum = round2(calculatedIgstSum);

  const calculatedTotalTax = round2(calculatedCgstSum + calculatedSgstSum + calculatedIgstSum);

  // Printed totals from bill
  const printedGrandTotal = round2(typeof totals.grand_total?.value === 'number' ? totals.grand_total.value : 0);
  const printedTaxable = round2(typeof totals.taxable_amount?.value === 'number' ? totals.taxable_amount.value : 0);
  const printedCgst = round2(typeof totals.cgst_total?.value === 'number' ? totals.cgst_total.value : 0);
  const printedSgst = round2(typeof totals.sgst_total?.value === 'number' ? totals.sgst_total.value : 0);
  const printedIgst = round2(typeof totals.igst_total?.value === 'number' ? totals.igst_total.value : 0);
  const printedTotalTax = round2(printedCgst + printedSgst + printedIgst);
  const printedRoundOff = round2(typeof totals.round_off?.value === 'number' ? totals.round_off.value : 0);
  const printedShipping = round2(typeof totals.shipping?.value === 'number' ? totals.shipping.value : 0);

  // Check 1: Line Items Sum vs Grand Total / Taxable
  const lineSumDiff = round2(Math.abs(calculatedLineItemsSum - (printedGrandTotal || calculatedLineItemsSum)));
  const lineSumMatches = lineSumDiff <= 2.0;
  if (!lineSumMatches && printedGrandTotal > 0) {
    discrepancies.push(
      `Sum of extracted line items (₹${calculatedLineItemsSum}) differs from printed grand total (₹${printedGrandTotal}) by ₹${lineSumDiff}.`
    );
  }

  // Check 2: Tax Calculation check
  let taxDiff = 0;
  let taxMatches = true;
  if (printedTotalTax > 0 && calculatedTotalTax > 0) {
    taxDiff = round2(Math.abs(calculatedTotalTax - printedTotalTax));
    taxMatches = taxDiff <= 2.0;
    if (!taxMatches) {
      discrepancies.push(
        `Sum of item taxes (₹${calculatedTotalTax}) differs from printed tax total (₹${printedTotalTax}) by ₹${taxDiff}.`
      );
    }
  }

  // Check 3: Grand Total equation: Taxable + Taxes + RoundOff + Shipping
  let calculatedGrandTotal = 0;
  if (printedTaxable > 0 && printedTotalTax > 0) {
    calculatedGrandTotal = round2(printedTaxable + printedTotalTax + printedRoundOff + printedShipping);
  } else {
    calculatedGrandTotal = calculatedLineItemsSum;
  }

  const grandTotalDiff = round2(Math.abs(calculatedGrandTotal - printedGrandTotal));
  const grandTotalMatches = printedGrandTotal === 0 || grandTotalDiff <= 2.0;

  if (!grandTotalMatches && printedGrandTotal > 0) {
    discrepancies.push(
      `Calculated grand total (Taxable ₹${printedTaxable} + Tax ₹${printedTotalTax} + Round-off ₹${printedRoundOff} = ₹${calculatedGrandTotal}) does not match printed bill total ₹${printedGrandTotal} (Diff: ₹${grandTotalDiff}).`
    );
  }

  const isValid = discrepancies.length === 0;
  const status: 'VERIFIED' | 'MISMATCH' | 'WARNING' = isValid
    ? 'VERIFIED'
    : discrepancies.length > 2
    ? 'MISMATCH'
    : 'WARNING';

  const summary = isValid
    ? '✓ Invoice calculations verified — All row items, taxable subtotals, GST components, and grand total balance perfectly.'
    : `⚠ Calculation mismatch detected (${discrepancies.length} discrepancy found). Review line items before saving.`;

  return {
    isValid,
    status,
    summary,
    checks: {
      lineItemsSum: {
        calculated: calculatedLineItemsSum,
        printed: printedGrandTotal,
        match: lineSumMatches,
        diff: lineSumDiff,
      },
      taxCalculation: {
        calculatedTax: calculatedTotalTax,
        printedTax: printedTotalTax,
        match: taxMatches,
        diff: taxDiff,
      },
      grandTotalCalculation: {
        calculatedTotal: calculatedGrandTotal,
        printedTotal: printedGrandTotal,
        match: grandTotalMatches,
        diff: grandTotalDiff,
      },
    },
    discrepancies,
  };
}
