export interface BoundingBox {
  x: number; // 0 to 1000 normalized percentage
  y: number; // 0 to 1000 normalized percentage
  width: number;
  height: number;
  page?: number;
}

export interface ExtractedField<T = string | number | null> {
  value: T;
  confidence: number;
  source_text?: string;
  bbox?: BoundingBox;
  verified?: boolean;
  needsVerification?: boolean;
  verificationReason?: string;
}

export interface ExtractedItem {
  id?: string;
  item_name: ExtractedField<string>;
  full_description: ExtractedField<string>; // Complete exact description preserved without shortening
  brand?: ExtractedField<string>;
  model?: ExtractedField<string>;
  sku?: ExtractedField<string>;
  product_code?: ExtractedField<string>;
  hsn_sac?: ExtractedField<string>;
  quantity: ExtractedField<number>;
  unit?: ExtractedField<string>;
  rate: ExtractedField<number>;
  mrp?: ExtractedField<number>;
  discount?: ExtractedField<number>;
  taxable_amount: ExtractedField<number>;
  gst_rate?: ExtractedField<number>;
  cgst?: ExtractedField<number>;
  sgst?: ExtractedField<number>;
  igst?: ExtractedField<number>;
  cess?: ExtractedField<number>;
  other_taxes?: ExtractedField<number>;
  line_total: ExtractedField<number>;
  bbox?: BoundingBox;

  // Inventory matching metadata
  matchedProductId?: string;
  matchedProduct?: {
    id: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    currentStock: number;
    purchasePrice: number;
    sellingPrice: number;
    hsn?: string | null;
  } | null;
  isMatched?: boolean;
  matchScore?: number;
  isNewProduct?: boolean;
  serialNumbers?: string;
}

export interface ExtractedSupplier {
  business_name: ExtractedField<string>;
  legal_name?: ExtractedField<string>;
  gstin?: ExtractedField<string>;
  pan?: ExtractedField<string>;
  address?: ExtractedField<string>;
  city?: ExtractedField<string>;
  state?: ExtractedField<string>;
  state_code?: ExtractedField<string>;
  pin_code?: ExtractedField<string>;
  phone?: ExtractedField<string>;
  email?: ExtractedField<string>;
  website?: ExtractedField<string>;
}

export interface ExtractedCustomer {
  customer_name: ExtractedField<string>;
  gstin?: ExtractedField<string>;
  address?: ExtractedField<string>;
  state?: ExtractedField<string>;
  state_code?: ExtractedField<string>;
  phone?: ExtractedField<string>;
  email?: ExtractedField<string>;
}

export interface ExtractedInvoiceMeta {
  invoice_number: ExtractedField<string>;
  invoice_date: ExtractedField<string>;
  due_date?: ExtractedField<string>;
  purchase_order_number?: ExtractedField<string>;
  reference_number?: ExtractedField<string>;
  place_of_supply?: ExtractedField<string>;
  reverse_charge?: ExtractedField<string | boolean>;
  eway_bill_number?: ExtractedField<string>;
  transport_information?: ExtractedField<string>;
}

export interface ExtractedTotals {
  gross_amount?: ExtractedField<number>;
  discount?: ExtractedField<number>;
  taxable_amount: ExtractedField<number>;
  cgst_total?: ExtractedField<number>;
  sgst_total?: ExtractedField<number>;
  igst_total?: ExtractedField<number>;
  cess?: ExtractedField<number>;
  round_off?: ExtractedField<number>;
  shipping?: ExtractedField<number>;
  other_charges?: ExtractedField<number>;
  grand_total: ExtractedField<number>;
  amount_paid?: ExtractedField<number>;
  balance_due?: ExtractedField<number>;
  amount_in_words?: ExtractedField<string>;
}

export interface ExtractedPaymentAndBank {
  payment_mode?: ExtractedField<string>;
  bank_name?: ExtractedField<string>;
  account_number?: ExtractedField<string>;
  ifsc_code?: ExtractedField<string>;
  upi_id?: ExtractedField<string>;
  transaction_reference?: ExtractedField<string>;
}

export interface DocumentClassification {
  document_type:
    | 'GST Invoice'
    | 'Retail Bill'
    | 'Purchase Invoice'
    | 'Tax Invoice'
    | 'Quotation'
    | 'Estimate'
    | 'Credit Note'
    | 'Debit Note'
    | 'Receipt'
    | 'Delivery Challan'
    | 'Other';
  confidence: number;
  regions_detected: string[];
}

export interface MathematicalVerificationResult {
  isValid: boolean;
  status: 'VERIFIED' | 'MISMATCH' | 'WARNING';
  summary: string;
  checks: {
    lineItemsSum: {
      calculated: number;
      printed: number;
      match: boolean;
      diff: number;
    };
    taxCalculation: {
      calculatedTax: number;
      printedTax: number;
      match: boolean;
      diff: number;
    };
    grandTotalCalculation: {
      calculatedTotal: number;
      printedTotal: number;
      match: boolean;
      diff: number;
    };
  };
  discrepancies: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingPurchase?: {
    id: string;
    purchaseNumber: string;
    date: string;
    supplierName: string;
    supplierInvoiceNumber: string;
    grandTotal: number;
  };
  warningMessage?: string;
}

export interface RawVisionExtraction {
  document_type: string;
  document_type_confidence: number;
  regions_detected: string[];
  supplier: Record<string, any>;
  customer: Record<string, any>;
  invoice: Record<string, any>;
  items: Array<Record<string, any>>;
  taxes: Record<string, any>;
  totals: Record<string, any>;
  payment: Record<string, any>;
  bank_details: Record<string, any>;
  terms: string[];
  additional_information: string[];
  extraction_notes: string[];
}

export interface AIBillVisionResult {
  success: boolean;
  error?: string;
  documentClassification: DocumentClassification;
  supplier: ExtractedSupplier;
  customer: ExtractedCustomer;
  invoice: ExtractedInvoiceMeta;
  items: ExtractedItem[];
  totals: ExtractedTotals;
  paymentAndBank: ExtractedPaymentAndBank;
  terms: string[];
  additionalInformation: string[];
  extractionNotes: string[];
  mathVerification: MathematicalVerificationResult;
  duplicateDetection?: DuplicateDetectionResult;
  matchedSupplier?: {
    id: string;
    name: string;
    gstin?: string | null;
    currentBalance: number;
    patterns?: any;
  } | null;
  uploadedFiles: Array<{
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }>;
  rawJson?: RawVisionExtraction;
  providerUsed: string;
  modelUsed: string;
}
