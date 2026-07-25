import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { ObservabilityActivityQueryDto } from './observability.dto';
import { ObservabilityService } from './observability.service';

@Auth()
@Controller('observability')
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get('runtime/:runtimeId')
  async getOverview(
    @Param('runtimeId', ParseUUIDPipe) runtimeId: string,
    @Query() query: ObservabilityActivityQueryDto,
  ) {
    const data = await this.observabilityService.getOverview(runtimeId, {
      limit: query.limit,
      offset: query.offset,
    });
    return {
      success: true,
      data,
      message: 'Observability overview retrieved',
    };
  }

  @Get('summary/:runtimeId')
  async getSummary(@Param('runtimeId', ParseUUIDPipe) runtimeId: string) {
    const data = await this.observabilityService.getSummary(runtimeId);
    return {
      success: true,
      data,
      message: 'Observability summary retrieved',
    };
  }

  @Get('activity/:activityId')
  async getActivity(
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    const data = await this.observabilityService.getActivityDetails(activityId);
    return {
      success: true,
      data,
      message: 'Activity details retrieved',
    };
  }
}
