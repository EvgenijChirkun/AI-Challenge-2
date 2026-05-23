import { AIRPORT_CODE, GATES, GROUND_CREW_COUNT, RUNWAYS } from './config.js';
import type { AirportStatus, Flight, FlightRequest, Gate, Runway, ScheduledSlot } from './types.js';

export interface AirportState {
  airportCode: string;
  runways: Runway[];
  gates: Gate[];
  flights: Flight[];
  timeline: ScheduledSlot[];
}

export const airportState: AirportState = {
  airportCode: AIRPORT_CODE,
  runways: structuredClone(RUNWAYS),
  gates: structuredClone(GATES),
  flights: [],
  timeline: [],
};

export function submitFlight(request: FlightRequest): Flight {
  const existing = airportState.flights.find((flight) => flight.flightId === request.flightId);

  if (existing) {
    throw new Error(`Flight ${request.flightId} already exists`);
  }

  const flight: Flight = {
    ...request,
    status: 'queued',
    submittedAt: new Date().toISOString(),
  };

  airportState.flights.push(flight);
  return flight;
}

export function cancelFlight(flightId: string): Flight {
  const flight = airportState.flights.find((item) => item.flightId === flightId);

  if (!flight) {
    throw new Error(`Flight ${flightId} was not found`);
  }

  flight.status = 'cancelled';
  flight.unscheduledReason = 'Cancelled by user request';

  airportState.timeline = airportState.timeline.filter((slot) => slot.flightId !== flightId);

  delete flight.scheduledStart;
  delete flight.scheduledEnd;
  delete flight.assignedRunwayId;
  delete flight.assignedGateId;

  return flight;
}

export function getAirportStatus(): AirportStatus {
  const queuedFlights = airportState.flights.filter((flight) => flight.status === 'queued');
  const scheduledFlights = airportState.flights.filter((flight) => flight.status === 'scheduled');
  const cancelledFlights = airportState.flights.filter((flight) => flight.status === 'cancelled');
  const unscheduledFlights = airportState.flights.filter(
    (flight) => flight.status === 'unscheduled',
  );

  const usedRunways = new Set(
    scheduledFlights
      .map((flight) => flight.assignedRunwayId)
      .filter((value): value is string => Boolean(value)),
  ).size;

  const usedGates = new Set(
    scheduledFlights
      .map((flight) => flight.assignedGateId)
      .filter((value): value is string => Boolean(value)),
  ).size;

  const scheduleCompletionTime =
    scheduledFlights
      .map((flight) => flight.scheduledEnd)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    airportCode: airportState.airportCode,
    currentTime: new Date().toISOString(),
    runways: airportState.runways,
    gates: airportState.gates,
    queuedFlights,
    scheduledFlights,
    cancelledFlights,
    unscheduledFlights,
    counts: {
      queued: queuedFlights.length,
      scheduled: scheduledFlights.length,
      cancelled: cancelledFlights.length,
      unscheduled: unscheduledFlights.length,
      arrivals: airportState.flights.filter((flight) => flight.type === 'arrival').length,
      departures: airportState.flights.filter((flight) => flight.type === 'departure').length,
    },
    resourceUsage: {
      runwayCount: airportState.runways.length,
      gateCount: airportState.gates.length,
      groundCrewCount: GROUND_CREW_COUNT,
      usedRunways,
      usedGates,
      scheduleCompletionTime,
    },
  };
}

export function resetScheduleState(): void {
  airportState.timeline = [];

  for (const flight of airportState.flights) {
    if (flight.status === 'scheduled' || flight.status === 'unscheduled') {
      flight.status = 'queued';
      delete flight.scheduledStart;
      delete flight.scheduledEnd;
      delete flight.assignedRunwayId;
      delete flight.assignedGateId;
      delete flight.unscheduledReason;
    }
  }
}
