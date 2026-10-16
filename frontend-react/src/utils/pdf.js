/**
 * LANNENT — a small PDF writer for the report downloads.
 *
 * Produces a real PDF file (not a print dialog) with a title, headings,
 * wrapped paragraphs and label/value rows, across as many A4 pages as the
 * content needs. It uses the built-in Helvetica fonts, so nothing is
 * embedded and the file stays small.
 *
 *   downloadPdf('dispute-d1.pdf', {
 *     title: 'Dispute Resolution Report',
 *     subtitle: 'E-commerce Website Redesign',
 *     sections: [
 *       { heading: 'Case', rows: [['Status', 'Resolved'], ['Verdict', 'Worker favour']] },
 *       { heading: 'Reasoning', text: 'After reviewing …' },
 *     ],
 *   });
 */

const PAGE_W = 595.28;   // A4 in points
const PAGE_H = 841.89;
const MARGIN = 54;
const LINE = 1.45;       // line height as a multiple of the font size

/** The built-in fonts only cover Latin-1; map the punctuation people actually type. */
function toLatin(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[←-⇿☀-➿\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

/** Escapes a string for a PDF literal. */
function esc(s) {
  return toLatin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Approximate Helvetica advance widths (per 1000 units) — enough to wrap well.
const NARROW = "il.,;:'!|()[]{}tfjrI ";
const WIDE = 'mwMW@%';
function textWidth(s, size, bold) {
  let units = 0;
  for (const ch of toLatin(s)) {
    if (NARROW.includes(ch)) units += 280;
    else if (WIDE.includes(ch)) units += 850;
    else if (ch >= 'A' && ch <= 'Z') units += 660;
    else if (ch >= '0' && ch <= '9') units += 556;
    else units += 520;
  }
  return (units / 1000) * size * (bold ? 1.06 : 1);
}

/** Splits text into lines that fit `width` at `size`. Honours explicit newlines. */
function wrap(text, width, size, bold) {
  const out = [];
  for (const para of toLatin(text).split(/\r?\n/)) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, bold) <= width) { line = candidate; continue; }
      if (line) out.push(line);
      // A single word longer than the line is cut where it overflows.
      let w = word;
      while (textWidth(w, size, bold) > width) {
        let cut = w.length;
        while (cut > 1 && textWidth(w.slice(0, cut), size, bold) > width) cut--;
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

/** Lays the document out into pages of drawing commands. */
function layout({ title, subtitle, meta, sections = [] }) {
  const pages = [];
  let ops = [];
  let y = PAGE_H - MARGIN;
  const contentW = PAGE_W - MARGIN * 2;

  const newPage = () => { pages.push(ops); ops = []; y = PAGE_H - MARGIN; };
  const ensure = h => { if (y - h < MARGIN + 20) newPage(); };
  const text = (s, x, size, bold, color = '0 0 0') => {
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(s)}) Tj ET`);
  };
  const rule = (color = '0.85 0.85 0.88') => {
    ops.push(`${color} RG 0.8 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
  };
  const paragraph = (s, size = 10.5, bold = false, color = '0.15 0.15 0.18', indent = 0) => {
    for (const line of wrap(s, contentW - indent, size, bold)) {
      ensure(size * LINE);
      y -= size * LINE;
      if (line) text(line, MARGIN + indent, size, bold, color);
    }
  };

  // Header
  y -= 6;
  text('Lannent', MARGIN, 10, true, '0.31 0.27 0.9');
  y -= 26;
  for (const line of wrap(title || 'Report', contentW, 20, true)) { text(line, MARGIN, 20, true); y -= 26; }
  if (subtitle) { y += 8; paragraph(subtitle, 12, false, '0.35 0.35 0.4'); }
  if (meta) { paragraph(meta, 9, false, '0.5 0.5 0.55'); }
  y -= 10;
  rule();
  y -= 6;

  for (const section of sections) {
    ensure(40);
    y -= 22;
    if (section.heading) { text(section.heading.toUpperCase(), MARGIN, 9.5, true, '0.31 0.27 0.9'); y -= 4; }
    if (section.rows) {
      for (const [label, value] of section.rows) {
        const labelW = 150;
        const lines = wrap(value == null || value === '' ? '-' : String(value), contentW - labelW, 10.5, false);
        ensure(lines.length * 10.5 * LINE);
        y -= 10.5 * LINE;
        text(String(label), MARGIN, 10, true, '0.4 0.4 0.45');
        lines.forEach((line, i) => {
          if (i > 0) y -= 10.5 * LINE;
          text(line, MARGIN + labelW, 10.5, false, '0.1 0.1 0.12');
        });
      }
    }
    if (section.text) { y -= 2; paragraph(section.text); }
    if (section.bullets) {
      for (const b of section.bullets) paragraph(`- ${b}`, 10.5, false, '0.15 0.15 0.18', 6);
    }
  }
  pages.push(ops);
  return pages;
}

/** Builds the PDF bytes. */
export function buildPdf(doc) {
  const pages = layout(doc);
  const objects = [];
  const add = body => { objects.push(body); return objects.length; };

  const catalogId = add(null);
  const pagesId = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pageIds = [];
  pages.forEach((ops, i) => {
    const footer = `BT /F1 8 Tf 0.55 0.55 0.6 rg ${MARGIN} 30 Td (${esc(`Generated by Lannent on ${new Date().toISOString().slice(0, 10)}  -  Page ${i + 1} of ${pages.length}`)}) Tj ET`;
    const stream = [...ops, footer].join('\n');
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  // Every character is Latin-1 by construction, so each maps to one byte.
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

/** Builds the PDF and hands it to the browser to save. */
export function downloadPdf(filename, doc) {
  const blob = new Blob([buildPdf(doc)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
