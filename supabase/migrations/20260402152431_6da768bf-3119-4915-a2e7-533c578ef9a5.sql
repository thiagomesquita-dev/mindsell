-- Fix training_session with wrong empresa_id (carteira MULTINACIONAL belongs to Solut Guarapuava)
UPDATE training_sessions 
SET empresa_id = 'ab918f56-b7bd-4e38-84df-e65e89fddc55'
WHERE id = '6a36070b-6d09-4074-ae79-2e57e1bfed24'
  AND empresa_id = '51392b8d-f80a-4039-a617-5d673a90cf54';

-- Fix corresponding ai_usage_log
UPDATE ai_usage_logs
SET empresa_id = 'ab918f56-b7bd-4e38-84df-e65e89fddc55'
WHERE training_id = '6a36070b-6d09-4074-ae79-2e57e1bfed24'
  AND empresa_id = '51392b8d-f80a-4039-a617-5d673a90cf54';