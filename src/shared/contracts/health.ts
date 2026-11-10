export interface HealthResponse {
  ok: true;
  service: 'group9-backend';
  stage: 'G1_FOUNDATION';
  businessEndpointsEnabled: false;
}
export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    row['ok'] === true &&
    row['service'] === 'group9-backend' &&
    row['stage'] === 'G1_FOUNDATION' &&
    row['businessEndpointsEnabled'] === false
  );
}
