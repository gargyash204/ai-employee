import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { CreateExecutionDto, ListExecutionsQueryDto } from './execution.dto';
import { ExecutionService } from './execution.service';

@Auth()
@Controller('executions')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post()
  async create(@Body() body: CreateExecutionDto) {
    const data = await this.executionService.create(body);
    return {
      success: true,
      data,
      message: 'Execution queued — this can take a few minutes',
    };
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

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.executionService.cancel(id);
    return {
      success: true,
      data,
      message: 'Execution cancelled',
    };
  }
}
