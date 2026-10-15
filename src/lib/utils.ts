import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency as Indian Rupees (e.g., ₹24,000.00)
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format numbers in Indian numbering system without currency symbol (e.g., 24,000)
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}

// Format dates nicely
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Convert amount to words in Indian Rupees (e.g., "Twenty Nine Thousand Rupees only")
export function numberToWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees only';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const wholeNumber = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - wholeNumber) * 100);

  function convertHundreds(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(wholeNumber / 10000000);
  const lakh = Math.floor((wholeNumber % 10000000) / 100000);
  const thousand = Math.floor((wholeNumber % 100000) / 1000);
  const hundred = wholeNumber % 1000;

  if (crore > 0) words += convertHundreds(crore) + ' Crore ';
  if (lakh > 0) words += convertHundreds(lakh) + ' Lakh ';
  if (thousand > 0) words += convertHundreds(thousand) + ' Thousand ';
  if (hundred > 0) words += convertHundreds(hundred) + ' ';

  words = words.trim();
  if (!words) words = 'Zero';

  let result = words + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paise';
  }
  return result + ' only';
}
