function csvCell(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sanitizeFilename(name) {
  return String(name || 'survey')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'survey';
}

export function downloadCsv(filename, csvContent) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildSummaryCsv(surveyTitle, resultsData) {
  const lines = [];
  lines.push(`Survey,${csvCell(surveyTitle)}`);
  lines.push(`Responses,${resultsData?.response_count ?? 0}`);
  lines.push('');

  for (const r of resultsData?.results || []) {
    lines.push(`Question,${csvCell(r.prompt)}`);
    lines.push(`Type,${csvCell(r.type)}`);

    if (r.type === 'single' || r.type === 'multi') {
      lines.push('Option,Count,Percent');
      const total = r.total ?? r.total_responses ?? 0;
      for (const [opt, count] of Object.entries(r.counts || {})) {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        lines.push(`${csvCell(opt)},${count},${pct}%`);
      }
    } else if (r.type === 'rating') {
      lines.push(`Average,${r.average ?? ''}`);
      lines.push('Rating,Count,Percent');
      const total = r.total ?? 0;
      for (let n = 1; n <= 5; n++) {
        const count = r.distribution?.[n] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        lines.push(`${n},${count},${pct}%`);
      }
    } else if (r.type === 'text') {
      lines.push('Answer');
      for (const text of r.answers || []) {
        lines.push(csvCell(text));
      }
      if (!r.answers?.length) {
        lines.push('');
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function exportSurveySummaryCsv(surveyTitle, resultsData) {
  const base = sanitizeFilename(surveyTitle);
  downloadCsv(`${base}-summary.csv`, buildSummaryCsv(surveyTitle, resultsData));
}
