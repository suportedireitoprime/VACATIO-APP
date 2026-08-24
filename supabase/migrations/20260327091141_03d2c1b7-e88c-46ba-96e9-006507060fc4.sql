
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'CF88_CONSTITUICAO_FEDERAL','CP_CODIGO_PENAL','CC_CODIGO_CIVIL',
      'CPC_CODIGO_PROCESSO_CIVIL','CPP_CODIGO_PROCESSO_PENAL',
      'CTN_CODIGO_TRIBUTARIO_NACIONAL','CDC_CODIGO_DEFESA_CONSUMIDOR',
      'CLT_CONSOLIDACAO_LEIS_TRABALHO','CTB_CODIGO_TRANSITO_BRASILEIRO',
      'CE_CODIGO_ELEITORAL','CPM_CODIGO_PENAL_MILITAR',
      'CPPM_CODIGO_PROCESSO_PENAL_MILITAR','CFLOR_CODIGO_FLORESTAL',
      'CCOM_CODIGO_COMERCIAL','CBA_CODIGO_BRASILEIRO_AERONAUTICA',
      'CAGUA_CODIGO_AGUAS','CMIN_CODIGO_MINAS','CTEL_CODIGO_TELECOMUNICACOES',
      'ECA_ESTATUTO_CRIANCA_ADOLESCENTE','EI_ESTATUTO_IDOSO',
      'EPD_ESTATUTO_PESSOA_DEFICIENCIA','EIR_ESTATUTO_IGUALDADE_RACIAL',
      'EC_ESTATUTO_CIDADE','ED_ESTATUTO_DESARMAMENTO','EOAB_ESTATUTO_OAB',
      'ET_ESTATUTO_TORCEDOR','EJ_ESTATUTO_JUVENTUDE','EM_ESTATUTO_MILITARES',
      'EIND_ESTATUTO_INDIO','ETERRA_ESTATUTO_TERRA','EMIG_ESTATUTO_MIGRACAO',
      'EREF_ESTATUTO_REFUGIADO','EMET_ESTATUTO_METROPOLE','EMUS_ESTATUTO_MUSEUS',
      'EME_ESTATUTO_MICROEMPRESA','EPC_ESTATUTO_PESSOA_CANCER'
    ])
  LOOP
    EXECUTE format('UPDATE %I SET texto = regexp_replace(texto, ''(\d)o\b'', ''\1º'', ''g'') WHERE texto ~ ''(\d)o\b''', tbl);
    EXECUTE format('UPDATE %I SET caput = regexp_replace(caput, ''(\d)o\b'', ''\1º'', ''g'') WHERE caput ~ ''(\d)o\b''', tbl);
    EXECUTE format('UPDATE %I SET texto = replace(texto, ''°'', ''º'') WHERE texto LIKE ''%%°%%''', tbl);
    EXECUTE format('UPDATE %I SET caput = replace(caput, ''°'', ''º'') WHERE caput LIKE ''%%°%%''', tbl);
  END LOOP;

  UPDATE constituicoes_estaduais SET texto = regexp_replace(texto, '(\d)o\b', '\1º', 'g') WHERE texto ~ '(\d)o\b';
  UPDATE constituicoes_estaduais SET caput = regexp_replace(caput, '(\d)o\b', '\1º', 'g') WHERE caput ~ '(\d)o\b';
  UPDATE constituicoes_estaduais SET texto = replace(texto, '°', 'º') WHERE texto LIKE '%°%';
  UPDATE constituicoes_estaduais SET caput = replace(caput, '°', 'º') WHERE caput LIKE '%°%';
END;
$$;
