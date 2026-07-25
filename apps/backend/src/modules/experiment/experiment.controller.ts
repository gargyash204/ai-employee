import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { RunExperimentDto } from './experiment.dto';
import { ExperimentService } from './experiment.service';

@Auth()
@Controller('experiment')
export class ExperimentController {
  constructor(private readonly experimentService: ExperimentService) {}

  @Post('run')
  async run(@Body() body: RunExperimentDto) {
    const data = await this.experimentService.run(body);
    return {
      success: true,
      data,
      message: 'Experiment completed',
    };
  }

  @Get('session/:id')
  async getSession(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.experimentService.getSession(id);
    return {
      success: true,
      data,
      message: 'Experiment session retrieved',
    };
  }
}
