const text = `Art. 41. São pessoas jurídicas de direito público interno:
I - a União;
...
(Redação dada pela Lei nº 11.107, de 2005)
`;

const extractDateFromText = (text) => {
  let bestDate = 0, bestMonth = 0, bestYear = 0;
  const regex = /(?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Revogad[oa]).*?de\s+(?:(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4}))/gi;
  let match, hasMonthFound = false;
  while ((match = regex.exec(text)) !== null) {
    let y = 0, m = 0, hm = false;
    if (match[4]) {
      y = parseInt(match[4], 10);
    } else if (match[3]) {
      y = parseInt(match[3], 10);
      m = parseInt(match[2], 10) - 1;
      hm = true;
    }
    if (y > 1900 && y <= new Date().getFullYear()) {
      const score = y * 100 + m;
      if (score > bestDate) {
        bestDate = score; bestYear = y; bestMonth = m; hasMonthFound = hm;
      }
    }
  }
  return bestYear > 0 ? { year: bestYear, month: bestMonth, hasMonth: hasMonthFound, score: bestDate } : null;
};

const detectTag = (text) => {
   const m = text.match(/\((Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i);
   if (m) {
     const type = m[1].toLowerCase();
     if (type.includes('revogad')) return { label: 'Revogado', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
     if (type.includes('inclu')) return { label: 'Incluído', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
     return { label: 'Alterado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
   }
   return null;
};

console.log('Date:', extractDateFromText(text));
console.log('Tag:', detectTag(text));
