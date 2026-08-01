import { BadRequestException } from '@nestjs/common';
import { open, readFile, stat } from 'node:fs/promises';

export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const PDF_MIME = 'application/pdf';
const PDF_MAGIC = Buffer.from('%PDF');

export async function assertValidPdfUpload(input: {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}): Promise<void> {
  if (!input.path) {
    throw new BadRequestException('Uploaded file is missing');
  }

  if (input.size <= 0) {
    throw new BadRequestException('Uploaded file is empty');
  }

  if (input.size > MAX_PDF_BYTES) {
    throw new BadRequestException('PDF must be 2 MB or smaller');
  }

  const fileStat = await stat(input.path);
  if (fileStat.size <= 0) {
    throw new BadRequestException('Uploaded file is empty');
  }
  if (fileStat.size > MAX_PDF_BYTES) {
    throw new BadRequestException('PDF must be 2 MB or smaller');
  }

  const mimeOk =
    input.mimetype === PDF_MIME ||
    input.mimetype === 'application/x-pdf' ||
    input.mimetype === '';
  const nameOk = input.originalname.toLowerCase().endsWith('.pdf');
  if (!mimeOk && !nameOk) {
    throw new BadRequestException('Only PDF files are supported');
  }

  const header = Buffer.alloc(5);
  const handle = await open(input.path, 'r');
  try {
    await handle.read(header, 0, 5, 0);
  } finally {
    await handle.close();
  }

  if (!header.subarray(0, 4).equals(PDF_MAGIC)) {
    throw new BadRequestException('File is not a valid PDF');
  }

  // Sample the start of the file for an Encrypt dictionary (password-protected).
  const sample = await readFile(input.path, { encoding: 'latin1' });
  if (/\/Encrypt[\s/[<]/.test(sample.slice(0, Math.min(sample.length, 200_000)))) {
    throw new BadRequestException(
      'Password-protected PDFs are not supported',
    );
  }
}
