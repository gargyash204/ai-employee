import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PDFParse } from 'pdf-parse';
import type { ParseResult, ParserStrategy } from '../parser-strategy.interface';
import { hasMeaningfulText, normalizeExtractedText } from '../text-normalize';

const execFileAsync = promisify(execFile);

// ponytail: OCR capped at 5 pages / 90s — ceiling for Railway demo latency. Upgrade: page budget config + worker queue.
const OCR_MAX_PAGES = 5;
const OCR_TIMEOUT_MS = 90_000;
const PDF_PARSE_TIMEOUT_MS = 30_000;

@Injectable()
export class PdfParserStrategy implements ParserStrategy {
  readonly contentTypes = ['application/pdf', 'application/x-pdf'] as const;
  private readonly logger = new Logger(PdfParserStrategy.name);

  async parse(filePath: string): Promise<ParseResult> {
    const embedded = await this.extractEmbeddedText(filePath);
    const normalizedEmbedded = normalizeExtractedText(embedded);

    if (hasMeaningfulText(normalizedEmbedded)) {
      return { text: normalizedEmbedded, method: 'embedded' };
    }

    this.logger.log(
      JSON.stringify({
        message: 'Embedded text empty; falling back to OCR',
        filePath: filePath.split('/').pop(),
      }),
    );

    const ocrText = await this.ocrPdf(filePath);
    const normalizedOcr = normalizeExtractedText(ocrText);

    if (!hasMeaningfulText(normalizedOcr)) {
      throw new BadRequestException(
        'No readable text could be extracted from this PDF',
      );
    }

    return { text: normalizedOcr, method: 'ocr' };
  }

  private async extractEmbeddedText(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    try {
      const parsed = await withTimeout(
        parser.getText(),
        PDF_PARSE_TIMEOUT_MS,
        'PDF text extraction timed out',
      );
      return typeof parsed.text === 'string' ? parsed.text : '';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/password|encrypt/i.test(message)) {
        throw new BadRequestException(
          'Password-protected PDFs are not supported',
        );
      }
      if (/timed out/i.test(message)) {
        throw new BadRequestException(message);
      }
      throw new BadRequestException(
        'PDF appears corrupted or could not be parsed',
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async ocrPdf(filePath: string): Promise<string> {
    const workDir = await mkdtemp(join(tmpdir(), 'zamp-ocr-'));

    try {
      await withTimeout(
        execFileAsync(
          'pdftoppm',
          [
            '-png',
            '-r',
            '200',
            '-f',
            '1',
            '-l',
            String(OCR_MAX_PAGES),
            filePath,
            join(workDir, 'page'),
          ],
          { timeout: OCR_TIMEOUT_MS },
        ),
        OCR_TIMEOUT_MS,
        'OCR timed out while rendering PDF pages',
      );

      const pages = (await readdir(workDir))
        .filter((name) => name.endsWith('.png'))
        .sort();

      if (pages.length === 0) {
        throw new BadRequestException(
          'OCR failed: could not render PDF pages',
        );
      }

      const chunks: string[] = [];
      for (const page of pages) {
        const { stdout } = await withTimeout(
          execFileAsync(
            'tesseract',
            [join(workDir, page), 'stdout', '-l', 'eng', '--psm', '3'],
            {
              timeout: OCR_TIMEOUT_MS,
              maxBuffer: 8 * 1024 * 1024,
            },
          ),
          OCR_TIMEOUT_MS,
          'OCR timed out while reading page text',
        );
        chunks.push(stdout);
      }

      return chunks.join('\n\n');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      if (/ENOENT|not found/i.test(message)) {
        throw new BadRequestException(
          'OCR is unavailable on this server (tesseract/poppler missing)',
        );
      }
      if (/timed out/i.test(message)) {
        throw new BadRequestException(message);
      }

      this.logger.error(`OCR failure: ${message}`);
      throw new BadRequestException('OCR failed while reading this PDF');
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new BadRequestException(message));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
