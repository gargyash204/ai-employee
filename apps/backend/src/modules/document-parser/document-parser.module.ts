import { Module } from '@nestjs/common';
import { DocumentParserService } from './document-parser.service';
import { PdfParserStrategy } from './strategies/pdf-parser.strategy';
import { TempFileService } from './temp-file.service';

@Module({
  providers: [TempFileService, PdfParserStrategy, DocumentParserService],
  exports: [TempFileService, DocumentParserService],
})
export class DocumentParserModule {}
