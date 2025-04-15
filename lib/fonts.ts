import PDFDocument from 'pdfkit';
import path from 'path';

export const registerFonts = (doc: typeof PDFDocument) => {
  doc.registerFont('Roboto', path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'));
  doc.registerFont('Roboto-Bold', path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf'));
  doc.registerFont('Roboto-Italic', path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf'));
  doc.registerFont('Roboto-BoldItalic', path.join(process.cwd(), 'public', 'fonts', 'Roboto-BoldItalic.ttf'));
};
