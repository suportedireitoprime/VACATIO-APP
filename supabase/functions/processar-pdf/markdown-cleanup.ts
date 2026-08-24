export interface MarkdownPage {
  source_page: number;
  markdown: string;
}

const BLANK_LINE_RE = /^\s*$/;
const HEADING_RE = /^#{1,6}\s+/;
const FULL_LINE_BOLD_RE = /^\*\*(.*?)\*\*$/;
const LOOSE_NUMERIC_MARKER_RE = /^\s*(\d{1,4})\.\s*$/;
const PAGE_ARTIFACT_RE = /^\s*(?:[—–-]\s*)?\d{1,4}\.?(?:\s*[—–-])?\s*$/;
const TABLE_LINE_RE = /^\|.+\|$/;

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.*?)\*\*$/, "$1")
    .replace(/^__(.*?)__$/, "$1")
    .replace(/^\*(.*?)\*$/, "$1")
    .replace(/^_(.*?)_$/, "$1")
    .trim();
}

function countMatches(input: string, regex: RegExp): number {
  return (input.match(regex) || []).length;
}

function isLikelyTitleLine(line: string): boolean {
  const stripped = stripMarkdown(line);

  if (!stripped || stripped.length > 120) {
    return false;
  }

  if (HEADING_RE.test(line) || FULL_LINE_BOLD_RE.test(line)) {
    return true;
  }

  const letters = countMatches(stripped, /[A-Za-zÀ-ÿ]/g);
  if (letters === 0) {
    return false;
  }

  const uppercaseLetters = countMatches(stripped, /[A-ZÀ-Ý]/g);
  const uppercaseRatio = uppercaseLetters / letters;
  const words = stripped.split(/\s+/).filter(Boolean);

  if (uppercaseRatio >= 0.55) {
    return true;
  }

  return words.length <= 10 && !/[.!?]$/.test(stripped);
}

function collapseBlankLines(lines: string[]): string[] {
  const collapsed: string[] = [];
  let previousWasBlank = true;

  for (const line of lines) {
    const isBlank = BLANK_LINE_RE.test(line);
    if (isBlank) {
      if (!previousWasBlank) {
        collapsed.push("");
      }
    } else {
      collapsed.push(line);
    }
    previousWasBlank = isBlank;
  }

  while (collapsed[0] === "") {
    collapsed.shift();
  }

  while (collapsed[collapsed.length - 1] === "") {
    collapsed.pop();
  }

  return collapsed;
}

export function normalizeOcrMarkdown(markdown: string): string {
  if (!markdown) {
    return "";
  }

  const baseLines = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    // Strip inline LaTeX: $_{\text{X}}$ → X, $\text{X}$ → X, etc.
    .replace(/\$[_^]?\{?\\text\{([^}]*)\}\}?\$/g, "$1")
    .replace(/\$[_^]?\{([^}]*)\}\$/g, "$1")
    .replace(/\$\\?([A-Za-zÀ-ÿ]+)\$/g, "$1")
    // Remove remaining isolated $ signs from broken LaTeX
    .replace(/\$\s*/g, "")
    // Fix hyphenation at line breaks (word-\nword → word)
    .replace(/([A-Za-zÀ-ÿ])-\n([a-zà-ÿ])/g, "$1$2")
    .replace(/([A-Za-zÀ-ÿ])­\n([a-zà-ÿ])/g, "$1$2") // soft hyphen
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      // Preserve table lines — don't collapse internal spacing
      if (TABLE_LINE_RE.test(trimmed)) return trimmed;
      return line.replace(/[ \t]{2,}/g, " ").trim();
    });

  const mergedLines: string[] = [];

  for (let i = 0; i < baseLines.length; i++) {
    const current = baseLines[i];
    const next = baseLines[i + 1] ?? "";
    const markerMatch = current.match(LOOSE_NUMERIC_MARKER_RE);

    if (markerMatch && isLikelyTitleLine(next)) {
      const title = stripMarkdown(next);
      mergedLines.push(`**${markerMatch[1]}\\. ${title}**`);
      i += 1;
      continue;
    }

    mergedLines.push(current);
  }

  const cleanedLines: string[] = [];

  for (let i = 0; i < mergedLines.length; i++) {
    const line = mergedLines[i];
    const trimmed = line.trim();
    const previousTrimmed = cleanedLines[cleanedLines.length - 1]?.trim() ?? "";
    const nextTrimmed = mergedLines[i + 1]?.trim() ?? "";

    if (!trimmed) {
      cleanedLines.push("");
      continue;
    }

    if (PAGE_ARTIFACT_RE.test(trimmed) && !LOOSE_NUMERIC_MARKER_RE.test(trimmed)) {
      const isNearEdge = i <= 1 || i >= mergedLines.length - 2;
      const surroundedByBlanks = !previousTrimmed && !nextTrimmed;

      if (isNearEdge || surroundedByBlanks) {
        continue;
      }
    }

    const looseMarkerMatch = trimmed.match(LOOSE_NUMERIC_MARKER_RE);
    if (looseMarkerMatch) {
      const isNearEdge = i <= 1 || i >= mergedLines.length - 2;
      const surroundedByBlanks = !previousTrimmed && !nextTrimmed;

      if (isNearEdge || surroundedByBlanks) {
        continue;
      }

      cleanedLines.push(`${looseMarkerMatch[1]}\\.`);
      continue;
    }

    cleanedLines.push(trimmed);
  }

  // Post-process: ensure markdown tables have separator rows
  const finalLines = collapseBlankLines(cleanedLines);
  const withSeparators: string[] = [];

  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const nextLine = finalLines[i + 1] ?? "";

    withSeparators.push(line);

    // If this line is a table row and next line is also a table row (but not a separator),
    // inject a separator after the first table row (header)
    if (TABLE_LINE_RE.test(line.trim()) && TABLE_LINE_RE.test(nextLine.trim())) {
      const isSeparator = /^\|[\s\-:]+\|$/.test(nextLine.trim());
      // Only inject if no separator exists yet and the previous line wasn't already a table row
      const prevLine = withSeparators[withSeparators.length - 2]?.trim() ?? "";
      const prevIsTable = TABLE_LINE_RE.test(prevLine);
      if (!isSeparator && !prevIsTable) {
        // Count columns from the header
        const cols = line.trim().split("|").filter(Boolean).length;
        const sep = "|" + Array(cols).fill(" --- ").join("|") + "|";
        withSeparators.push(sep);
      }
    }
  }

  return withSeparators.join("\n").trim();
}

export function normalizeMarkdownPages(pages: MarkdownPage[]): MarkdownPage[] {
  return pages.map((page) => ({
    source_page: page.source_page,
    markdown: normalizeOcrMarkdown(page.markdown),
  }));
}

export function mergeCleanedPages(
  originalPages: MarkdownPage[],
  cleanedPages: MarkdownPage[]
): MarkdownPage[] {
  const cleanedByPage = new Map(
    cleanedPages.map((page) => [page.source_page, normalizeOcrMarkdown(page.markdown)])
  );

  return originalPages.map((page) => ({
    source_page: page.source_page,
    markdown: cleanedByPage.get(page.source_page) ?? normalizeOcrMarkdown(page.markdown),
  }));
}