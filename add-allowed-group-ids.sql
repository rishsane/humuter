-- Add allowed_group_ids column to agents table
-- This restricts which TG groups the bot will respond in.
-- If NULL or empty, the bot responds in ALL groups (backwards compatible).
-- If populated, the bot only responds in those specific groups + supervisor DMs.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS allowed_group_ids bigint[] DEFAULT '{}';
