import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PDF and image files are supported' },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File exceeds the 10 MB limit. Please upload a smaller file.' },
      { status: 400 }
    );
  }

  // All file checks happen before Supabase upload to avoid orphaned records
  const fileBuffer = await file.arrayBuffer();

  // Multi-page PDF check
  if (file.type === 'application/pdf') {
    const pdfText = Buffer.from(fileBuffer).toString('binary');
    const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;
    if (pageCount > 1) {
      return NextResponse.json(
        { error: `This PDF has ${pageCount} pages. Only single-page documents are supported. Please extract the relevant page and re-upload.` },
        { status: 400 }
      );
    }
  }

  // Bill validation — use OpenAI vision to check if image looks like a bill/invoice/receipt
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const base64 = Buffer.from(fileBuffer).toString('base64');
      const check = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Is this image a bill, invoice, or receipt? Reply only: yes or no.' },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}`, detail: 'low' } },
          ],
        }],
      });
      const answer = check.choices[0].message.content?.toLowerCase() ?? 'no';
      if (!answer.includes('yes')) {
        return NextResponse.json(
          { error: 'This does not appear to be a valid bill or invoice. Please upload a bill, invoice, or receipt.' },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('Bill validation check failed:', err);
      // If the check itself fails, let the upload continue
    }
  }

  // Duplicate detection — hash the file and check if already uploaded
  const fileHash = createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex');
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('bills')
    .select('id, file_name')
    .eq('file_hash', fileHash)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: `This file has already been uploaded (as "${existing.file_name}"). Please check your dashboard for the existing bill.` },
      { status: 409 }
    );
  }

  // Ensure the storage bucket exists (creates it on first run)
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === 'bills');
  if (!bucketExists) {
    await supabase.storage.createBucket('bills', { public: true });
  }

  // Upload file to Supabase Storage — strip all non-safe characters from filename
  const ext = file.name.split('.').pop() ?? 'bin';
  const safeName = file.name
    .replace(/\.[^.]+$/, '')               // remove extension
    .replace(/[^a-zA-Z0-9_-]/g, '_')      // replace unsafe chars
    .slice(0, 60);                         // cap length
  const filePath = `${Date.now()}-${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('bills')
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('bills').getPublicUrl(filePath);
  const fileUrl = urlData.publicUrl;

  // Create bill record with processing status
  const { data: bill, error: dbError } = await supabase
    .from('bills')
    .insert({ file_name: file.name, file_url: fileUrl, file_path: filePath, file_hash: fileHash, status: 'processing' })
    .select()
    .single();

  if (dbError) {
    const msg = dbError.message.includes('relation "bills" does not exist')
      ? 'Database table not found — please run supabase/schema.sql in your Supabase SQL editor first.'
      : dbError.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Trigger n8n OCR workflow
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (n8nWebhookUrl) {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/n8n`;
    try {
      const n8nForm = new FormData();
      n8nForm.append('data', new Blob([fileBuffer], { type: file.type }), file.name);
      n8nForm.append('bill_id', bill.id);
      n8nForm.append('file_url', fileUrl);
      n8nForm.append('callback_url', callbackUrl);
      n8nForm.append('secret', process.env.N8N_WEBHOOK_SECRET ?? '');

      const n8nRes = await fetch(n8nWebhookUrl, { method: 'POST', body: n8nForm });

      if (!n8nRes.ok) {
        // n8n rejected the file (e.g. multi-page PDF, bad file type)
        let reason = 'Could not process the file.';
        try {
          const n8nBody = await n8nRes.json();
          if (n8nBody?.message) reason = n8nBody.message;
          else if (n8nBody?.error?.message) reason = n8nBody.error.message;
        } catch { /* ignore parse errors */ }

        // Clean up the orphaned bill record and storage file
        await supabase.from('bills').delete().eq('id', bill.id);
        await supabase.storage.from('bills').remove([filePath]);

        return NextResponse.json({ error: reason }, { status: 422 });
      }
    } catch (err) {
      console.error('Failed to trigger n8n webhook:', err);
    }
  }

  return NextResponse.json({ bill_id: bill.id });
}
