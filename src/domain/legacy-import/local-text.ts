import ExcelJS from 'exceljs';
import unzipper from 'unzipper';

const MAX_TEXT_CHARS = 160_000;

function cleanXml(xml: string) {
  return xml
    .replace(/<w:tab\/?[^>]*>/g, '\t')
    .replace(/<w:br\/?[^>]*>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractLocalDocumentText(input: { data: Buffer; mimeType: string; filename: string }): Promise<string | null> {
  const lower = input.filename.toLowerCase();
  if (input.mimeType.startsWith('text/') || ['application/json', 'application/xml'].includes(input.mimeType) || /\.(txt|csv|json|xml)$/.test(lower)) {
    return input.data.toString('utf8').slice(0, MAX_TEXT_CHARS);
  }
  if (input.mimeType.includes('wordprocessingml') || lower.endsWith('.docx')) {
    const directory = await unzipper.Open.buffer(input.data);
    const document = directory.files.find((entry: { path: string }) => entry.path === 'word/document.xml');
    if (!document) return null;
    return cleanXml((await document.buffer()).toString('utf8')).slice(0, MAX_TEXT_CHARS);
  }
  if (input.mimeType.includes('spreadsheetml') || lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(input.data);
    const lines: string[] = [];
    workbook.eachSheet((sheet: any) => {
      lines.push(`# Planilha: ${sheet.name}`);
      sheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
        if (rowNumber > 2000) return;
        const values = Array.isArray(row.values) ? row.values.slice(1).map((value: unknown) => typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')) : [];
        lines.push(values.join(' | '));
      });
    });
    return lines.join('\n').slice(0, MAX_TEXT_CHARS);
  }
  return null;
}
