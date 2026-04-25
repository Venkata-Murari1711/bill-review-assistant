-- Run this in your Supabase SQL editor

create table if not exists bills (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- File info
  file_name text,
  file_url text,
  file_path text,
  file_hash text unique,

  -- Processing status
  status text default 'processing'
    check (status in ('processing', 'ready', 'approved', 'paid')),

  -- Extracted fields (from Claude via n8n OCR text)
  vendor_name text,
  invoice_number text,
  bill_type text
    check (bill_type in ('rent', 'utility', 'supplier', 'tax', 'payroll', 'subscription', 'miscellaneous')),
  issue_date date,
  due_date date,
  payment_terms text,
  amount numeric(12, 2),
  currency text default 'USD',
  extraction_confidence numeric(3, 2),

  -- Decision engine output
  recommendation text
    check (recommendation in ('pay_now', 'pay_this_week', 'review_first', 'possible_duplicate')),
  explanation text,
  suspicious_flag boolean default false,
  duplicate_flag boolean default false,

  -- Raw OCR text from n8n
  raw_text text
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bills_updated_at
  before update on bills
  for each row execute function update_updated_at();

-- Enable RLS (open policy for development — tighten in production)
alter table bills enable row level security;
create policy "allow_all" on bills for all using (true) with check (true);

-- Storage bucket for uploaded bill files
insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict do nothing;

create policy "allow_upload" on storage.objects
  for insert with check (bucket_id = 'bills');

create policy "allow_read" on storage.objects
  for select using (bucket_id = 'bills');
