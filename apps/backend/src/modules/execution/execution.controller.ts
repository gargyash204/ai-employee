import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import {
  assertValidPdfUpload,
  MAX_PDF_BYTES,
  PDF_MIME,
} from '../document-parser/pdf-validation';
import { TempFileService } from '../document-parser/temp-file.service';
import {
  CreateExecutionUploadDto,
  ListExecutionsQueryDto,
} from './execution.dto';
import { ExecutionService } from './execution.service';
import { MulterExceptionFilter } from './multer-exception.filter';

@Auth()
@Controller('executions')
@UseFilters(MulterExceptionFilter)
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly tempFileService: TempFileService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_PDF_BYTES,
        files: 1,
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CreateExecutionUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const tempPath = await this.tempFileService.saveBuffer(
      file.buffer,
      file.originalname || 'upload.pdf',
    );

    try {
      await assertValidPdfUpload({
        originalname: file.originalname || 'upload.pdf',
        mimetype: file.mimetype || PDF_MIME,
        size: file.size || file.buffer.length,
        path: tempPath,
      });

      const data = await this.executionService.createFromUpload({
        runtimeId: body.runtimeId,
        versionId: body.versionId,
        tempFilePath: tempPath,
        mimetype: file.mimetype || PDF_MIME,
      });

      return {
        success: true,
        data,
        message: 'Execution queued — parsing PDF then running AI',
      };
    } catch (error) {
      await this.tempFileService.delete(tempPath);
      throw error;
    }
  }

  @Get()
  async list(@Query() query: ListExecutionsQueryDto) {
    const data = await this.executionService.list(query.runtimeId);
    return {
      success: true,
      data,
      message: 'Executions retrieved',
    };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.executionService.getById(id);
    return {
      success: true,
      data,
      message: 'Execution retrieved',
    };
  }

  @Post(':id/resume')
  async resume(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.executionService.resume(id);
    return {
      success: true,
      data,
      message: 'Execution resumed — running in the background',
    };
  }
}
