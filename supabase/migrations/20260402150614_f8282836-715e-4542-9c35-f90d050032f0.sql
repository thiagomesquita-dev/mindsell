-- Backfill empresa_id on training_generation logs by matching timestamps with training_sessions
UPDATE ai_usage_logs l
SET empresa_id = ts.empresa_id,
    training_id = ts.id
FROM training_sessions ts
WHERE l.action_type = 'training_generation'
  AND l.empresa_id IS NULL
  AND ts.created_at BETWEEN l.created_at - interval '5 seconds' AND l.created_at + interval '5 seconds'
  AND ts.empresa_id IS NOT NULL;