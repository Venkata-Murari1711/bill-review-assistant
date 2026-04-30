import { NextRequest, NextResponse } from 'next/server';
import { answerBillQuestion } from '@/lib/claude';
import { Bill } from '@/lib/types';

async function getBills(): Promise<Bill[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/bills?select=*&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body.question ?? '';
    const history: { role: 'user' | 'assistant'; content: string }[] = body.history ?? [];

    if (!question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const bills = await getBills();
    const answer = await answerBillQuestion(question, bills, history);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[/api/qa]', err);
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
