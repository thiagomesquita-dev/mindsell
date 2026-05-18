-- Backfill: promove campos de avaliação aninhados em avaliacao_ia->'aida' para colunas top-level
-- nos treinos respondidos cujas colunas estão NULL mas o JSON contém os dados aninhados.
UPDATE public.training_sessions
SET
  nota_final = COALESCE(nota_final, NULLIF(avaliacao_ia->'aida'->>'nota_final','')::numeric),
  qualidade_resposta = COALESCE(qualidade_resposta, avaliacao_ia->'aida'->>'qualidade_resposta'),
  entendimento = COALESCE(entendimento, avaliacao_ia->'aida'->>'entendimento'),
  coerencia = COALESCE(coerencia, avaliacao_ia->'aida'->>'coerencia'),
  nivel_aprendizado = COALESCE(nivel_aprendizado, avaliacao_ia->'aida'->>'nivel_aprendizado'),
  avaliacao_ia = (
    -- promove chaves aninhadas em aida (exceto as notas AIDA core) para o root, sem sobrescrever existentes
    (
      SELECT
        (avaliacao_ia - 'aida')
        || jsonb_build_object(
             'aida',
             (avaliacao_ia->'aida')
               - 'nota_final' - 'qualidade_resposta' - 'entendimento' - 'coerencia'
               - 'nivel_aprendizado' - 'resposta_recomendada' - 'licao_esperada' - 'feedback'
               - 'diagnostico' - 'ponto_forte' - 'principal_erro' - 'como_corrigir'
               - 'interpretacao_correta' - 'explicacao_interpretacao'
               - 'decisao_ideal' - 'explicacao_decisao' - 'resumo_nota'
           )
        || (
             SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
             FROM jsonb_each(avaliacao_ia->'aida') AS e(k, v)
             WHERE k IN (
               'nota_final','qualidade_resposta','entendimento','coerencia','nivel_aprendizado',
               'resposta_recomendada','licao_esperada','feedback','diagnostico','ponto_forte',
               'principal_erro','como_corrigir','interpretacao_correta','explicacao_interpretacao',
               'decisao_ideal','explicacao_decisao','resumo_nota'
             )
               AND NOT (avaliacao_ia ? k)
           )
    )
  )
WHERE status = 'respondido'
  AND avaliacao_ia ? 'aida'
  AND (
    nota_final IS NULL
    OR entendimento IS NULL
    OR coerencia IS NULL
  )
  AND (avaliacao_ia->'aida') ?| array['nota_final','entendimento','coerencia','feedback','licao_esperada','resposta_recomendada'];