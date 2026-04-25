export type BillStatus = 'processing' | 'ready' | 'approved' | 'paid';
export type BillType = 'rent' | 'utility' | 'supplier' | 'tax' | 'payroll' | 'subscription' | 'miscellaneous';
export type Recommendation = 'pay_now' | 'pay_this_week' | 'review_first' | 'possible_duplicate';

export interface Bill {
  id: string;
  created_at: string;
  updated_at: string;
  file_name: string | null;
  file_url: string | null;
  file_path: string | null;
  status: BillStatus;
  vendor_name: string | null;
  invoice_number: string | null;
  bill_type: BillType | null;
  issue_date: string | null;
  due_date: string | null;
  payment_terms: string | null;
  amount: number | null;
  currency: string | null;
  extraction_confidence: number | null;
  recommendation: Recommendation | null;
  explanation: string | null;
  suspicious_flag: boolean;
  duplicate_flag: boolean;
  raw_text: string | null;
}

// What Claude returns from extraction
export interface BillExtraction {
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  issue_date: string | null;
  due_date: string | null;
  payment_terms: string | null;
  bill_type: BillType | null;
  confidence: number | null;
}
