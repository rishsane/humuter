-- Telegram personal account (userbot) support
ALTER TABLE agents ADD COLUMN IF NOT EXISTS telegram_account_type text DEFAULT 'bot';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS telegram_account_session text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS telegram_account_phone text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS telegram_account_phone_code_hash text;
