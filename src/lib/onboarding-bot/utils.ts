const BOT_TOKEN = () => process.env.ONBOARDING_BOT_TOKEN!;
const TG_API = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: InlineButton[][] }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await fetch(`${TG_API()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function sendInlineKeyboard(
  chatId: number,
  text: string,
  buttons: InlineButton[][]
) {
  return sendMessage(chatId, text, { inline_keyboard: buttons });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TG_API()}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

export async function getFile(fileId: string): Promise<Buffer | null> {
  const res = await fetch(`${TG_API()}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const data = await res.json();
  if (!data.ok) return null;

  const filePath = data.result.file_path;
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${BOT_TOKEN()}/${filePath}`
  );
  if (!fileRes.ok) return null;

  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function validateBotToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok) {
      return { valid: true, username: data.result.username };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function setWebhook(botToken: string, url: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  return data.ok === true;
}
