import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import {
  CompareVersionsDto,
  CreateCaseDto,
  CreateDatasetDto,
  RunEvaluationDto,
  UpdateCaseDto,
} from './evaluation.dto';
import { EvaluationService } from './evaluation.service';

@Auth()
@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('run')
  async run(@Body() body: RunEvaluationDto) {
    const data = await this.evaluationService.run(body);
    return {
      success: true,
      data,
      message: 'Evaluation completed',
    };
  }

  @Get('run/:id')
  async getRun(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.evaluationService.getRun(id);
    return {
      success: true,
      data,
      message: 'Evaluation run retrieved',
    };
  }

  @Get('runtime/:runtimeId/datasets')
  async listDatasets(@Param('runtimeId', ParseUUIDPipe) runtimeId: string) {
    const data = await this.evaluationService.listDatasetsForRuntime(runtimeId);
    return {
      success: true,
      data,
      message: 'Evaluation datasets retrieved',
    };
  }

  @Get('runtime/:runtimeId')
  async getRuntimeHistory(
    @Param('runtimeId', ParseUUIDPipe) runtimeId: string,
  ) {
    const data = await this.evaluationService.getRuntimeHistory(runtimeId);
    return {
      success: true,
      data,
      message: 'Evaluation history retrieved',
    };
  }

  @Get('dataset/:datasetId')
  async getDataset(@Param('datasetId', ParseUUIDPipe) datasetId: string) {
    const data = await this.evaluationService.getDataset(datasetId);
    return {
      success: true,
      data,
      message: 'Evaluation dataset retrieved',
    };
  }

  @Post('dataset')
  async createDataset(@Body() body: CreateDatasetDto) {
    const data = await this.evaluationService.createDataset(body);
    return {
      success: true,
      data,
      message: 'Evaluation dataset created',
    };
  }

  @Post('case')
  async createCase(@Body() body: CreateCaseDto) {
    const data = await this.evaluationService.createCase(body);
    return {
      success: true,
      data,
      message: 'Evaluation test case created',
    };
  }

  @Put('case/:id')
  async updateCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCaseDto,
  ) {
    const data = await this.evaluationService.updateCase(id, body);
    return {
      success: true,
      data,
      message: 'Evaluation test case updated',
    };
  }

  @Delete('case/:id')
  async deleteCase(@Param('id', ParseUUIDPipe) id: string) {
    await this.evaluationService.deleteCase(id);
    return {
      success: true,
      data: null,
      message: 'Evaluation test case deleted',
    };
  }

  @Post('compare')
  async compare(@Body() body: CompareVersionsDto) {
    const data = await this.evaluationService.compare(body);
    return {
      success: true,
      data,
      message: 'Evaluation versions compared',
    };
  }
}
