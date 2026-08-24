
CREATE OR REPLACE FUNCTION public.buscar_artigos_global(search_query text, tabelas text[] DEFAULT NULL::text[], max_results integer DEFAULT 30)
 RETURNS SETOF artigo_busca_result
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  all_tables text[] := ARRAY[
    'CF88_CONSTITUICAO_FEDERAL','CP_CODIGO_PENAL','CC_CODIGO_CIVIL',
    'CPC_CODIGO_PROCESSO_CIVIL','CPP_CODIGO_PROCESSO_PENAL',
    'CTN_CODIGO_TRIBUTARIO_NACIONAL','CDC_CODIGO_DEFESA_CONSUMIDOR',
    'CLT_CONSOLIDACAO_LEIS_TRABALHO','ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    'CTB_CODIGO_TRANSITO_BRASILEIRO','EI_ESTATUTO_IDOSO',
    'EPD_ESTATUTO_PESSOA_DEFICIENCIA','EOAB_ESTATUTO_OAB',
    'CE_CODIGO_ELEITORAL','CFLOR_CODIGO_FLORESTAL',
    'CPM_CODIGO_PENAL_MILITAR','CPPM_CODIGO_PROCESSO_PENAL_MILITAR',
    'CBA_CODIGO_BRASILEIRO_AERONAUTICA','CCOM_CODIGO_COMERCIAL',
    'CMIN_CODIGO_MINAS','CTEL_CODIGO_TELECOMUNICACOES',
    'CAGUA_CODIGO_AGUAS','EC_ESTATUTO_CIDADE',
    'ED_ESTATUTO_DESARMAMENTO','EIND_ESTATUTO_INDIO',
    'EIR_ESTATUTO_IGUALDADE_RACIAL','EJ_ESTATUTO_JUVENTUDE',
    'EM_ESTATUTO_MILITARES','EME_ESTATUTO_MICROEMPRESA',
    'EMET_ESTATUTO_METROPOLE','EMIG_ESTATUTO_MIGRACAO',
    'EMUS_ESTATUTO_MUSEUS','EPC_ESTATUTO_PESSOA_CANCER',
    'EREF_ESTATUTO_REFUGIADO','ET_ESTATUTO_TORCEDOR',
    'ETERRA_ESTATUTO_TERRA',
    -- Leis Especiais
    'LEP_EXECUCAO_PENAL','LMP_MARIA_PENHA','LD_LEI_DROGAS',
    'LOC_ORGANIZACAO_CRIMINOSA','LAA_ABUSO_AUTORIDADE',
    'LIT_INTERCEPTACAO_TELEFONICA','L8112_SERVIDORES_FEDERAIS',
    'LIA_IMPROBIDADE_ADMINISTRATIVA','NLL_LICITACOES',
    'LMS_MANDADO_SEGURANCA','LACP_ACAO_CIVIL_PUBLICA',
    'LJE_JUIZADOS_ESPECIAIS','LGPD_PROTECAO_DADOS',
    'MCI_MARCO_CIVIL_INTERNET','LF_FALENCIAS',
    'LA_ARBITRAGEM','LI_INQUILINATO',
    'LRP_REGISTROS_PUBLICOS','LOMAN_LEI_ORGANICA_MAGISTRATURA',
    'LAT_ANTITERRORISMO',
    -- Previdenciário
    'LBPS_BENEFICIOS_PREVIDENCIA','LCSS_CUSTEIO_SEGURIDADE',
    'LPC_PREVIDENCIA_COMPLEMENTAR'
  ];
  target_tables text[];
  t text;
  clean_q text;
  extracted_num text;
  has_number boolean;
  has_text boolean;
BEGIN
  target_tables := COALESCE(tabelas, all_tables);
  clean_q := trim(search_query);
  
  extracted_num := regexp_replace(clean_q, '[^0-9]', '', 'g');
  has_number := (extracted_num != '' AND length(extracted_num) <= 4);
  
  has_text := (length(regexp_replace(clean_q, '[^a-zA-ZÀ-ÿ]', '', 'g')) >= 3
               AND lower(regexp_replace(clean_q, '[^a-zA-ZÀ-ÿ]', '', 'g')) NOT IN ('art', 'artigo', 'a'));
  
  FOR t IN SELECT unnest(target_tables) LOOP
    IF has_number THEN
      RETURN QUERY EXECUTE format(
        'SELECT numero, caput, %L::text AS tabela_nome, 1.0::real AS rank
         FROM %I 
         WHERE numero = ''Art. '' || $1
            OR numero LIKE ''Art. '' || $1 || ''-%%''
         ORDER BY ordem_numero
         LIMIT 5',
        t, t
      ) USING extracted_num;
    END IF;
    
    IF has_text THEN
      RETURN QUERY EXECUTE format(
        'SELECT numero, caput, %L::text AS tabela_nome,
                ts_rank(to_tsvector(''portuguese'', caput), plainto_tsquery(''portuguese'', $1))::real AS rank
         FROM %I
         WHERE to_tsvector(''portuguese'', caput) @@ plainto_tsquery(''portuguese'', $1)
         ORDER BY rank DESC LIMIT 5',
        t, t
      ) USING clean_q;
    END IF;
  END LOOP;
  
  RETURN;
END;
$function$;
