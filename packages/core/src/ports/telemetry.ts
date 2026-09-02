export interface TelemetryPort {
  event(name: string, data?: Record<string, unknown>): void
}

export const noopTelemetry: TelemetryPort = { event: () => undefined }
