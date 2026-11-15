import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/staff/csv';

describe('CSV do registro de atividades', () => {
  it('escapa aspas, ponto e vírgula e quebras de linha', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('linha1\nlinha2')).toBe('"linha1\nlinha2"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(3.5)).toBe('3.5');
  });
  it('neutraliza fórmulas que o aluno poderia digitar (=, +, -, @)', () => {
    for (const bad of ['=1+1', '+cmd', '-2', '@SUM(A1)'])
      expect(csvCell(bad).startsWith("'")).toBe(true);
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
  });
  it('gera cabeçalho, linhas com CRLF e BOM para abrir com acento no Excel', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x', 'ç'],
        ['y', 'z;w'],
      ],
    );
    expect(csv.startsWith('﻿a;b\r\n')).toBe(true);
    expect(csv).toContain('x;ç\r\n');
    expect(csv).toContain('y;"z;w"\r\n');
  });
});
