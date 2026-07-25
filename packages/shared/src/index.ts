export type HealthStatus = 'ok' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
}
