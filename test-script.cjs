const text = "Art. 146 Na cessação... (Redação dada pelo Decreto-lei nº 1.535, de 13.4.1977";
const regex = /\((?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]).*?de\s+(?:(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4}))(?:\)|$)/gi;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log(match);
}
