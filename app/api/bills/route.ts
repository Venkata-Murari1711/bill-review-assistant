import { NextResponse } from 'next/server';

// GET /api/bills — list all bills, newest first
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${url}/rest/v1/bills?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
