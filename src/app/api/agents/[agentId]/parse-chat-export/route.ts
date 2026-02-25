import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TelegramExportMessage {
  id: number;
  type: string;
  date: string;
  date_unixtime?: string;
  from?: string;
  from_id?: string;
  text: string | Array<{ type: string; text: string }>;
}

interface TelegramExport {
  name?: string;
  messages?: TelegramExportMessage[];
}

function extractText(text: string | Array<{ type: string; text: string }>): string {
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) {
    return text.map((t) => (typeof t === 'string' ? t : t.text || '')).join('');
  }
  return '';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const { chat_export, admin_name, days } = body as {
      chat_export: TelegramExport;
      admin_name: string;
      days: number;
    };

    if (!chat_export?.messages || !admin_name) {
      return NextResponse.json({ error: 'chat_export and admin_name are required' }, { status: 400 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (days || 100));

    // Filter messages: from the admin, within the date range, with text content
    const adminMessages = chat_export.messages
      .filter((msg) => {
        if (msg.type !== 'message') return false;
        if (!msg.from || msg.from.toLowerCase() !== admin_name.toLowerCase()) return false;
        const text = extractText(msg.text);
        if (!text || text.trim().length < 5) return false;
        const msgDate = new Date(msg.date);
        return msgDate >= cutoffDate;
      })
      .map((msg) => ({
        date: msg.date,
        text: extractText(msg.text).trim(),
      }));

    if (adminMessages.length === 0) {
      return NextResponse.json({
        error: `No messages found from "${admin_name}" in the last ${days || 100} days`,
      }, { status: 400 });
    }

    // Build a concise training context from the admin's messages
    // Take up to 500 representative messages to avoid exceeding token limits
    const selectedMessages = adminMessages.slice(-500);

    const adminContext = selectedMessages
      .map((m) => m.text)
      .join('\n---\n');

    // Update agent training data
    const updatedTraining = {
      ...agent.training_data,
      admin_response_style: adminContext,
      admin_name: admin_name,
    };

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        training_data: updatedTraining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages_found: adminMessages.length,
      messages_used: selectedMessages.length,
      date_range: {
        from: selectedMessages[0]?.date,
        to: selectedMessages[selectedMessages.length - 1]?.date,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to parse chat export' }, { status: 500 });
  }
}
