import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { UpdateDraftDto } from './runtime-version.dto';
import { RuntimeVersionService } from './runtime-version.service';

@Auth()
@Controller('runtime')
export class RuntimeVersionController {
  constructor(private readonly versionService: RuntimeVersionService) {}

  @Get('version/:versionId')
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    const data = await this.versionService.getVersionById(versionId);
    return {
      success: true,
      data,
      message: 'Runtime version retrieved',
    };
  }

  @Get(':runtimeId/versions')
  async listVersions(
    @Param('runtimeId', ParseUUIDPipe) runtimeId: string,
  ) {
    const data = await this.versionService.listVersions(runtimeId);
    return {
      success: true,
      data,
      message: 'Runtime versions retrieved',
    };
  }

  @Get(':runtimeId/draft')
  async getDraft(@Param('runtimeId', ParseUUIDPipe) runtimeId: string) {
    const data = await this.versionService.getDraft(runtimeId);
    return {
      success: true,
      data,
      message: 'Draft version retrieved',
    };
  }

  @Put(':runtimeId/draft')
  async updateDraft(
    @Param('runtimeId', ParseUUIDPipe) runtimeId: string,
    @Body() body: UpdateDraftDto,
  ) {
    const data = await this.versionService.updateDraft(runtimeId, body);
    return {
      success: true,
      data,
      message: 'Draft version saved',
    };
  }

  @Post(':runtimeId/publish')
  async publish(@Param('runtimeId', ParseUUIDPipe) runtimeId: string) {
    const data = await this.versionService.publish(runtimeId);
    return {
      success: true,
      data,
      message: 'Draft version published',
    };
  }
}
