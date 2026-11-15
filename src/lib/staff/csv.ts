/** CSV para planilha (Excel e Google Planilhas): separador ponto e vírgula, BOM UTF-8 e proteção contra fórmulas. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  // uma célula que começa com = + - @ pode virar fórmula na planilha: neutraliza
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
