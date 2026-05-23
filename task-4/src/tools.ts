import { z } from 'zod';
import { analyzeBottlenecks, generateSchedule } from './scheduler.js';
import { cancelFlight, getAirportStatus, submitFlight } from './state.js';
import type { FlightRequest } from './types.js';

const dependencyFlightIdsSchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }

    if (value === undefined || value === null || value === '') {
      return [];
    }

    // MCP Inspector can send an empty array-like UI field as an object.
    // Only accept numeric-keyed array-like objects, otherwise treat it as empty.
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      const numericEntries = entries.filter(([key]) => /^\d+$/.test(key));

      if (numericEntries.length === 0) {
        return [];
      }

      return numericEntries
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, item]) => item)
        .filter((item): item is string => typeof item === 'string' && item.length > 0);
    }

    return [];
  }, z.array(z.string()))
  .default([])
  .describe('Flight IDs that must be scheduled before this flight');

export const submitFlightSchema = {
  flightId: z.string().min(1).describe('Unique flight identifier, for example FL-1001'),
  callsign: z.string().min(1).describe('Flight callsign, for example AIC123'),
  type: z.enum(['arrival', 'departure']).describe('Flight operation type'),
  priority: z.enum(['low', 'medium', 'high']).describe('Scheduling priority'),
  requestedTime: z.string().datetime().describe('Requested start time as an ISO-8601 datetime'),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(180)
    .describe('Expected runway slot duration in minutes'),
  requiresGate: z.boolean().describe('Whether the flight needs a gate assignment'),
  dependencyFlightIds: dependencyFlightIdsSchema,
};

export const cancelFlightSchema = {
  flightId: z.string().min(1).describe('Flight ID to cancel'),
};

type SubmitFlightInput = z.infer<z.ZodObject<typeof submitFlightSchema>>;
type CancelFlightInput = z.infer<z.ZodObject<typeof cancelFlightSchema>>;

function asTextResponse(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function handleSubmitFlight(input: SubmitFlightInput) {
  const request: FlightRequest = {
    flightId: input.flightId,
    callsign: input.callsign,
    type: input.type,
    priority: input.priority,
    requestedTime: input.requestedTime,
    durationMinutes: input.durationMinutes,
    requiresGate: input.requiresGate,
    dependencyFlightIds: input.dependencyFlightIds ?? [],
  };

  const flight = submitFlight(request);

  return asTextResponse({
    message: 'Flight submitted successfully',
    flight,
  });
}

export function handleGenerateSchedule() {
  return asTextResponse(generateSchedule());
}

export function handleGetAirportStatus() {
  return asTextResponse(getAirportStatus());
}

export function handleCancelFlight(input: CancelFlightInput) {
  const flight = cancelFlight(input.flightId);

  return asTextResponse({
    message: 'Flight cancelled successfully',
    flight,
  });
}

export function handleAnalyzeBottleneck() {
  return asTextResponse(analyzeBottlenecks());
}
