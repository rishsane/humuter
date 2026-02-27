-- Discord Integration: Add Discord fields to agents and escalations tables

-- Agents table: Discord configuration
ALTER TABLE agents ADD COLUMN IF NOT EXISTS discord_server_id text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS discord_allowed_channel_ids text[];
ALTER TABLE agents ADD COLUMN IF NOT EXISTS discord_supervisor_user_id text;

-- Escalations table: Multi-platform support
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'telegram';
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS discord_channel_id text;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS discord_message_id text;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS discord_forwarded_message_id text;
