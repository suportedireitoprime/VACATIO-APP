// Bandeiras dos estados via Wikimedia Commons (Special:FilePath serve o SVG/PNG
// diretamente com redimensionamento; usamos width pequeno para ficar leve).
const FILES: Record<string, string> = {
  AC: 'Bandeira_do_Acre.svg',
  AL: 'Bandeira_de_Alagoas.svg',
  AP: 'Bandeira_do_Amapá.svg',
  AM: 'Bandeira_do_Amazonas.svg',
  BA: 'Bandeira_da_Bahia.svg',
  CE: 'Bandeira_do_Ceará.svg',
  DF: 'Bandeira_do_Distrito_Federal_(Brasil).svg',
  ES: 'Bandeira_do_Espírito_Santo.svg',
  GO: 'Bandeira_de_Goiás.svg',
  MA: 'Bandeira_do_Maranhão.svg',
  MT: 'Bandeira_de_Mato_Grosso.svg',
  MS: 'Bandeira_de_Mato_Grosso_do_Sul.svg',
  MG: 'Bandeira_de_Minas_Gerais.svg',
  PA: 'Bandeira_do_Pará.svg',
  PB: 'Bandeira_da_Paraíba.svg',
  PR: 'Bandeira_do_Paraná.svg',
  PE: 'Bandeira_de_Pernambuco.svg',
  PI: 'Bandeira_do_Piauí.svg',
  RJ: 'Bandeira_do_estado_do_Rio_de_Janeiro.svg',
  RN: 'Bandeira_do_Rio_Grande_do_Norte.svg',
  RS: 'Bandeira_do_Rio_Grande_do_Sul.svg',
  RO: 'Bandeira_de_Rondônia.svg',
  RR: 'Bandeira_de_Roraima.svg',
  SC: 'Bandeira_de_Santa_Catarina.svg',
  SP: 'Bandeira_do_estado_de_São_Paulo.svg',
  SE: 'Bandeira_de_Sergipe.svg',
  TO: 'Bandeira_do_Tocantins.svg',
};

export function bandeiraUF(uf: string, width = 64): string | null {
  const file = FILES[uf.toUpperCase()];
  if (!file) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}
