/**
 * Text extraction utilities.
 *
 * In a browser environment, PDF text extraction requires a library like pdf.js.
 * For images, OCR requires tesseract.js or a server-side OCR service.
 *
 * This module provides the abstraction. When the libraries are installed,
 * the extraction logic can be added here without changing the UI.
 */

export interface ExtractionResult {
  text: string;
  status: 'extracted' | 'failed' | 'not_applicable';
}

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const type = file.type;

  if (type === 'text/plain') {
    try {
      const text = await file.text();
      return { text, status: 'extracted' };
    } catch {
      return { text: '', status: 'failed' };
    }
  }

  if (type === 'application/pdf') {
    // Integration point: use pdf.js to extract text from PDF
    // For now, we mark as pending — text extraction can be done server-side
    return { text: '', status: 'not_applicable' };
  }

  if (type.startsWith('image/')) {
    // Integration point: use tesseract.js for OCR
    return { text: '', status: 'not_applicable' };
  }

  return { text: '', status: 'not_applicable' };
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
