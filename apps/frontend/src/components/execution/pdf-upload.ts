const MAX_PDF_BYTES = 2 * 1024 * 1024

export type PdfValidationResult =
  | { ok: true; file: File }
  | { ok: false; message: string }

export function validatePdfFile(fileList: FileList | null): PdfValidationResult {
  if (!fileList || fileList.length === 0) {
    return { ok: false, message: 'Select a PDF file to execute' }
  }

  if (fileList.length > 1) {
    return { ok: false, message: 'Only one PDF can be uploaded at a time' }
  }

  const file = fileList[0]
  if (!file) {
    return { ok: false, message: 'Select a PDF file to execute' }
  }

  if (file.size <= 0) {
    return { ok: false, message: 'The selected file is empty' }
  }

  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, message: 'PDF must be 2 MB or smaller' }
  }

  const nameOk = file.name.toLowerCase().endsWith('.pdf')
  const typeOk =
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    file.type === ''

  if (!nameOk || !typeOk) {
    return { ok: false, message: 'Only PDF files are supported' }
  }

  return { ok: true, file }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
