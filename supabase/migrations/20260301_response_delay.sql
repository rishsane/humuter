-- Response delay setting: 'instant' (default) or 'natural' (30-60s human-like delay)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS response_delay text DEFAULT 'instant';
