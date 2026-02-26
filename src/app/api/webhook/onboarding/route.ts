import { NextResponse } from 'next/server';
import {
  getOrCreateSession,
  handleStart,
  handleCallbackQuery,
  handleTextMessage,
  handleDocumentMessage,
} from '@/lib/onboarding-bot/handlers';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    document?: { file_id: string; file_name?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();

    // Handle callback queries (inline button taps)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id;
      if (!chatId || !cq.data) {
        return NextResponse.json({ ok: true });
      }

      const session = await getOrCreateSession(cq.from.id, cq.from.username);
      await handleCallbackQuery(chatId, session, cq.id, cq.data);
      return NextResponse.json({ ok: true });
    }

    // Handle text/document messages
    const message = update.message;
    if (!message || !message.from) {
      return NextResponse.json({ ok: true });
    }

    // Only handle private (DM) messages
    if (message.chat.type !== 'private') {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const tgUserId = message.from.id;
    const tgUsername = message.from.username;

    const session = await getOrCreateSession(tgUserId, tgUsername);

    // Handle /start command
    if (message.text?.trim() === '/start') {
      await handleStart(chatId, session);
      return NextResponse.json({ ok: true });
    }

    // Handle document uploads
    if (message.document) {
      await handleDocumentMessage(chatId, session, message.document);
      return NextResponse.json({ ok: true });
    }

    // Handle text input
    if (message.text) {
      await handleTextMessage(chatId, session, message.text);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[onboarding-webhook] Error:', err instanceof Error ? err.message : err);
    // Always return 200 to prevent Telegram retries
    return NextResponse.json({ ok: true });
  }
}
