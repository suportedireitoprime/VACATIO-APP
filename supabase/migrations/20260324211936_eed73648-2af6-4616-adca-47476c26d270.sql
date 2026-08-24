
-- Remove CLT decree introductory articles (duplicates)
DELETE FROM "CLT_CONSOLIDACAO_LEIS_TRABALHO" WHERE id IN (
  '9362ba5f-661b-4235-859c-02392a5cdaaa',
  '50b8462c-7a44-47ad-bf9a-6509cbbb9d28'
);
