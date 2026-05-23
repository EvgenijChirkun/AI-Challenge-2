import type { Gate, Runway, RunwayCapability, RunwaySeparationBuffers } from './types.js';

function parsePositiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid configuration: ${name} must be a positive integer. Received: ${rawValue}`,
    );
  }

  return parsed;
}

function parseNonNegativeInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Invalid configuration: ${name} must be a non-negative integer. Received: ${rawValue}`,
    );
  }

  return parsed;
}

function parseCapabilityList(
  name: string,
  fallback: RunwayCapability[],
  count: number,
): RunwayCapability[] {
  const rawValue = process.env[name];

  const values = rawValue ? rawValue.split(',').map((item) => item.trim()) : fallback;

  const capabilities: RunwayCapability[] = [];

  for (const value of values) {
    if (value !== 'arrival' && value !== 'departure' && value !== 'mixed') {
      throw new Error(
        `Invalid configuration: ${name} contains unsupported runway capability "${value}". Accepted values: arrival, departure, mixed.`,
      );
    }

    capabilities.push(value);
  }

  while (capabilities.length < count) {
    capabilities.push(capabilities[capabilities.length - 1] ?? 'mixed');
  }

  return capabilities.slice(0, count);
}

function parsePositiveIntegerList(name: string, fallback: number[], count: number): number[] {
  const rawValue = process.env[name];

  const values = rawValue ? rawValue.split(',').map((item) => item.trim()) : fallback.map(String);

  const parsedValues = values.map((value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(
        `Invalid configuration: ${name} must contain positive integers. Received: ${rawValue}`,
      );
    }

    return parsed;
  });

  while (parsedValues.length < count) {
    parsedValues.push(parsedValues[parsedValues.length - 1] ?? 3000);
  }

  return parsedValues.slice(0, count);
}

function buildRunwayId(index: number): string {
  const defaultIds = ['RWY-09L', 'RWY-09R', 'RWY-18', 'RWY-27L', 'RWY-27R'];
  return defaultIds[index] ?? `RWY-${String(index + 1).padStart(2, '0')}`;
}

function buildGateId(index: number): string {
  const terminalCode = String.fromCharCode(65 + Math.floor(index / 10));
  const position = (index % 10) + 1;

  return `${terminalCode}${position}`;
}

export const AIRPORT_CODE = process.env.AIRPORT_CODE?.trim() || 'AIC';

export const RUNWAY_COUNT = parsePositiveInteger('RUNWAY_COUNT', 3);
export const GATE_COUNT = parsePositiveInteger('GATE_COUNT', 4);
export const GROUND_CREW_COUNT = parsePositiveInteger('GROUND_CREW_COUNT', 2);

export const ARRIVAL_SEPARATION_MINUTES = parsePositiveInteger('ARRIVAL_SEPARATION_MINUTES', 4);

export const DEPARTURE_SEPARATION_MINUTES = parsePositiveInteger('DEPARTURE_SEPARATION_MINUTES', 3);

export const MIXED_SEPARATION_MINUTES = parsePositiveInteger('MIXED_SEPARATION_MINUTES', 4);

export const GATE_TURNAROUND_MINUTES = parseNonNegativeInteger('GATE_TURNAROUND_MINUTES', 15);

export const DEFAULT_DEPENDENCY_BUFFER_MINUTES = parseNonNegativeInteger(
  'DEPENDENCY_BUFFER_MINUTES',
  10,
);

export const SCHEDULING_HORIZON_MINUTES = parsePositiveInteger('SCHEDULING_HORIZON_MINUTES', 180);

const runwayCapabilities = parseCapabilityList(
  'RUNWAY_CAPABILITIES',
  ['mixed', 'mixed', 'departure'],
  RUNWAY_COUNT,
);

const runwayLengths = parsePositiveIntegerList(
  'RUNWAY_LENGTHS_METERS',
  [3200, 3200, 2600],
  RUNWAY_COUNT,
);

const separationBuffers: RunwaySeparationBuffers = {
  arrivalMinutes: ARRIVAL_SEPARATION_MINUTES,
  departureMinutes: DEPARTURE_SEPARATION_MINUTES,
  mixedMinutes: MIXED_SEPARATION_MINUTES,
};

export const RUNWAYS: Runway[] = Array.from({ length: RUNWAY_COUNT }, (_, index) => {
  const id = buildRunwayId(index);

  return {
    id,
    name: `Runway ${id.replace('RWY-', '')}`,
    capability: runwayCapabilities[index] ?? 'mixed',
    lengthMeters: runwayLengths[index] ?? 3000,
    separationBuffers,
    isOpen: true,
  };
});

export const GATES: Gate[] = Array.from({ length: GATE_COUNT }, (_, index) => {
  const id = buildGateId(index);

  return {
    id,
    terminal: id[0] ?? 'A',
    turnaroundMinutes: GATE_TURNAROUND_MINUTES,
    isOpen: true,
  };
});
