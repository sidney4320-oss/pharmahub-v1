/** Browser-safe text extraction helpers for uploaded resources. */

export interface ExtractionResult {
  text: string;
  status: 'extracted' | 'failed' | 'not_applicable';
}

export async function extractTextFromFile(file: File | null | undefined): Promise<ExtractionResult> {
  if (!file || typeof file !== 'object' || typeof file.type !== 'string' || typeof file.text !== 'function') {
    return { text: '', status: 'failed' };
  }

  const type = file.type.toLowerCase();
  if (type === 'text/plain' || getFileExtension(file.name || '') === 'txt') {
    try {
      const text = await file.text();
      return text.trim() ? { text, status: 'extracted' } : { text: '', status: 'failed' };
    } catch {
      return { text: '', status: 'failed' };
    }
  }
  if (type === 'application/pdf' || getFileExtension(file.name || '') === 'pdf' || type.startsWith('image/')) {
    return { text: '', status: 'not_applicable' };
  }
  return { text: '', status: 'not_applicable' };
}

export function getFileExtension(filename: string): string {
  const safeName = typeof filename === 'string' ? filename : '';
  const parts = safeName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function isImageFile(mimeType: string): boolean {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return typeof mimeType === 'string' && mimeType.toLowerCase() === 'application/pdf';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
