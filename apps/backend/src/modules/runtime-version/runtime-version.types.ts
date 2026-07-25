import { RuntimeVersionStatus } from '../../repositories/runtime-version/runtime-version.entity';

export type RuntimeVersionResponse = {
  id: string;
  runtimeId: string;
  version: number;
  instructions: string;
  status: RuntimeVersionStatus;
  createdAt: string;
  updatedAt: string;
};
