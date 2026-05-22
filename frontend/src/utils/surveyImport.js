import * as XLSX from 'xlsx';

const REQUIRED_HEADERS = ['order', 'prompt', 'type', 'options', 'allow_other'];
const VALID_TYPES = new Set(['single', 'multi', 'rating', 'text']);
const DEFAULT_OPTIONS = ['Option 1', 'Option 2'];

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeBoolean(value) {
  const text = String(value || '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1';
}

function isRowEmpty(row) {
  return row.every((cell) => String(cell || '').trim() === '');
}

function parseOrder(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function parseSurveyXlsx(file) {
  if (!file) {
    throw new Error('Choose an .xlsx file to import');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error('The Excel file has no worksheets');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rows.length) {
    throw new Error('The worksheet is empty');
  }

  const headerRow = rows[0].map(normalizeHeader);
  const headerIndex = {};
  for (const header of REQUIRED_HEADERS) {
    const index = headerRow.indexOf(header);
    if (index === -1) {
      throw new Error(`Missing required column: ${header}`);
    }
    headerIndex[header] = index;
  }

  const parsed = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) continue;

    const excelRow = i + 1;
    const prompt = String(row[headerIndex.prompt] || '').trim();
    if (!prompt) {
      throw new Error(`Row ${excelRow}: prompt is required`);
    }

    const type = String(row[headerIndex.type] || '').trim().toLowerCase();
    if (!VALID_TYPES.has(type)) {
      throw new Error(`Row ${excelRow}: invalid type "${type}"`);
    }

    const parsedOrder = parseOrder(row[headerIndex.order], i);
    const allowOther = normalizeBoolean(row[headerIndex.allow_other]);
    const entry = {
      sortOrder: parsedOrder,
      sourceIndex: i,
      question: {
        prompt,
        type,
        options: DEFAULT_OPTIONS,
        allow_other: false,
      },
    };

    if (type === 'single' || type === 'multi') {
      const options = String(row[headerIndex.options] || '')
        .split('|')
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (options.length < 2) {
        throw new Error(`Row ${excelRow}: at least two options are required for ${type}`);
      }
      entry.question.options = options;
      entry.question.allow_other = allowOther;
    }

    parsed.push(entry);
  }

  if (!parsed.length) {
    throw new Error('No questions found in the worksheet');
  }

  parsed.sort((a, b) => a.sortOrder - b.sortOrder || a.sourceIndex - b.sourceIndex);
  return {
    questions: parsed.map((item) => item.question),
  };
}
