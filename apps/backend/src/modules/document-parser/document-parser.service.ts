import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PdfParserStrategy } from './strategies/pdf-parser.strategy';
import type { ParseResult, ParserStrategy } from './parser-strategy.interface';
import { PDF_MIME } from './pdf-validation';

@Injectable()
export class DocumentParserService {
  private readonly strategies: ParserStrategy[];

  constructor(pdfParser: PdfParserStrategy) {
    this.strategies = [pdfParser];
  }

  async parseFile(input: {
    filePath: string;
    mimetype: string;
  }): Promise<ParseResult> {
    const strategy = this.resolveStrategy(input.mimetype);
    if (!strategy) {
      throw new UnsupportedMediaTypeException(
        `Unsupported document type: ${input.mimetype || 'unknown'}`,
      );
    }

    try {
      return await strategy.parse(input.filePath);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnsupportedMediaTypeException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Parsing failed';
      throw new BadRequestException(message);
    }
  }

  private resolveStrategy(mimetype: string): ParserStrategy | undefined {
    const normalized = (mimetype || PDF_MIME).toLowerCase();
    return this.strategies.find((strategy) =>
      strategy.contentTypes.includes(normalized),
    );
  }
}
