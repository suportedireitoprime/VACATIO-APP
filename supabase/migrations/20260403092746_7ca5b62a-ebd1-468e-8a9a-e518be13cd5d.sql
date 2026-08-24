-- One-time data migration: populate lei_afetada from ementa
UPDATE kanban_proposicoes SET lei_afetada = 
  CASE 
    WHEN ementa ILIKE '%decreto-lei%2.848%' OR (ementa ILIKE '%código penal%' AND ementa NOT ILIKE '%código penal militar%' AND ementa NOT ILIKE '%processo penal%') THEN 'Código Penal'
    WHEN ementa ILIKE '%código civil%' OR ementa ILIKE '%10.406%' THEN 'Código Civil'
    WHEN ementa ILIKE '%código de processo civil%' OR ementa ILIKE '%13.105%' THEN 'CPC'
    WHEN ementa ILIKE '%código de processo penal%' OR ementa ILIKE '%processo penal militar%' IS FALSE AND ementa ILIKE '%3.689%' THEN 'CPP'
    WHEN ementa ILIKE '%código penal militar%' THEN 'Código Penal Militar'
    WHEN ementa ILIKE '%defesa do consumidor%' OR ementa ILIKE '%8.078%' THEN 'CDC'
    WHEN ementa ILIKE '%código de trânsito%' OR ementa ILIKE '%9.503%' THEN 'CTB'
    WHEN ementa ILIKE '%código tributário%' THEN 'CTN'
    WHEN ementa ILIKE '%código eleitoral%' THEN 'Código Eleitoral'
    WHEN ementa ILIKE '%código florestal%' THEN 'Código Florestal'
    WHEN ementa ILIKE '%consolidação das leis do trabalho%' OR ementa ILIKE '%CLT%' THEN 'CLT'
    WHEN ementa ILIKE '%criança e%adolescente%' OR ementa ILIKE '%8.069%' THEN 'ECA'
    WHEN ementa ILIKE '%estatuto%idoso%' THEN 'Estatuto do Idoso'
    WHEN ementa ILIKE '%pessoa com deficiência%' THEN 'EPD'
    WHEN ementa ILIKE '%maria da penha%' OR ementa ILIKE '%11.340%' THEN 'Lei Maria da Penha'
    WHEN ementa ILIKE '%execução penal%' OR ementa ILIKE '%7.210%' THEN 'LEP'
    WHEN ementa ILIKE '%proteção de dados%' OR ementa ILIKE '%13.709%' THEN 'LGPD'
    WHEN ementa ILIKE '%marco civil da internet%' OR ementa ILIKE '%12.965%' THEN 'Marco Civil da Internet'
    WHEN ementa ILIKE '%licitações%' OR ementa ILIKE '%14.133%' THEN 'Lei de Licitações'
    WHEN ementa ILIKE '%improbidade%' THEN 'Improbidade Administrativa'
    WHEN ementa ILIKE '%constituição federal%' THEN 'Constituição Federal'
    WHEN ementa ILIKE '%inquilinato%' THEN 'Lei do Inquilinato'
    ELSE NULL
  END
WHERE lei_afetada IS NULL AND ementa IS NOT NULL;