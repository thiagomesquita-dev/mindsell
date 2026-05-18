
UPDATE public.ai_usage_logs
SET estimated_cost_usd = ROUND((audio_seconds / 60.0) * 0.0043, 4)
WHERE provider = 'deepgram'
  AND audio_seconds IS NOT NULL
  AND audio_seconds > 0;
