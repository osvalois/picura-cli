//MDToPDFConverter.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { marked } from 'marked';

export class MDToPDFConverter {
  async convert(markdownContent: string): Promise<Buffer> {
    const html = await marked(markdownContent);
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
    const { width, height } = page.getSize();
    let currentY = height - 50;

    const writeText = (text: string, { fontSize = 12, font = timesRomanFont, indent = 0 }) => {
      const words = text.split(' ');
      let line = '';
      const lineHeight = fontSize * 1.2;

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > width - 100 - indent) {
          page.drawText(line, {
            x: 50 + indent,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          line = word;
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, {
          x: 50 + indent,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;
      }

      currentY -= 10; // Add some space after each text block

      if (currentY < 50) {
        currentY = height - 50;
        return pdfDoc.addPage([595.276, 841.890]);
      }
      return page;
    };

    const elements = html.split(/(<h[1-6].*?<\/h[1-6]>|<p>.*?<\/p>|<pre><code>[\s\S]*?<\/code><\/pre>|<ul>[\s\S]*?<\/ul>)/);

    for (const element of elements) {
      if (element.startsWith('<h1')) {
        writeText(element.replace(/<\/?h1>/g, '').trim(), { fontSize: 24, font: timesBoldFont });
      } else if (element.startsWith('<h2')) {
        writeText(element.replace(/<\/?h2>/g, '').trim(), { fontSize: 20, font: timesBoldFont });
      } else if (element.startsWith('<h3')) {
        writeText(element.replace(/<\/?h3>/g, '').trim(), { fontSize: 18, font: timesBoldFont });
      } else if (element.startsWith('<p')) {
        writeText(element.replace(/<\/?p>/g, '').trim(), { fontSize: 12 });
      } else if (element.startsWith('<pre><code>')) {
        const code = element.replace(/<\/?pre><\/?code>/g, '').trim();
        writeText(code, { fontSize: 10, indent: 20 });
      } else if (element.startsWith('<ul>')) {
        const items = element.match(/<li>.*?<\/li>/g) || [];
        for (const item of items) {
          writeText(`• ${item.replace(/<\/?li>/g, '').trim()}`, { fontSize: 12, indent: 20 });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}