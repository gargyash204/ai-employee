import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { CreateRuntimeDto, UpdateRuntimeDto } from './runtime.dto';
import { RuntimeService } from './runtime.service';

@Auth()
@Controller('runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Post()
  async create(@Body() body: CreateRuntimeDto) {
    const data = await this.runtimeService.create(body);
    return {
      success: true,
      data,
      message: 'Runtime created',
    };
  }

  @Get()
  async findAll() {
    const data = await this.runtimeService.findAll();
    return {
      success: true,
      data,
      message: 'Runtimes retrieved',
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.runtimeService.findById(id);
    return {
      success: true,
      data,
      message: 'Runtime retrieved',
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRuntimeDto,
  ) {
    const data = await this.runtimeService.update(id, body);
    return {
      success: true,
      data,
      message: 'Runtime updated',
    };
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.runtimeService.delete(id);
    return {
      success: true,
      data: null,
      message: 'Runtime deleted',
    };
  }
}
