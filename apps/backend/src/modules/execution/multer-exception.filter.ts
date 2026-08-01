import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import type { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'PDF must be 2 MB or smaller'
        : exception.code === 'LIMIT_FILE_COUNT' ||
            exception.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Only one PDF can be uploaded at a time'
          : 'File upload failed';

    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      data: null,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
