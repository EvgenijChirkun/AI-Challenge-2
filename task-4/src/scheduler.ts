import { DEFAULT_DEPENDENCY_BUFFER_MINUTES, SCHEDULING_HORIZON_MINUTES } from './config.js';
import { airportState, resetScheduleState } from './state.js';
import type {
  BottleneckAnalysis,
  Flight,
  FlightPriority,
  Gate,
  Runway,
  ScheduleResult,
  ScheduledSlot,
} from './types.js';

const PRIORITY_WEIGHT: Record<FlightPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function toDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  return date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlapsWithBuffer(
  start: Date,
  end: Date,
  existingStart: Date,
  existingEnd: Date,
  bufferMinutes: number,
): boolean {
  const bufferedExistingStart = addMinutes(existingStart, -bufferMinutes);
  const bufferedExistingEnd = addMinutes(existingEnd, bufferMinutes);

  return start < bufferedExistingEnd && end > bufferedExistingStart;
}

function runwaySupportsFlight(runway: Runway, flight: Flight): boolean {
  return runway.capability === 'mixed' || runway.capability === flight.type;
}

function getScheduledDependencyEnd(flight: Flight): Date | null {
  let latestDependencyEnd: Date | null = null;

  for (const dependencyFlightId of flight.dependencyFlightIds) {
    const dependency = airportState.flights.find((item) => item.flightId === dependencyFlightId);

    if (!dependency || dependency.status !== 'scheduled' || !dependency.scheduledEnd) {
      return null;
    }

    const dependencyEnd = toDate(dependency.scheduledEnd);

    if (!latestDependencyEnd || dependencyEnd > latestDependencyEnd) {
      latestDependencyEnd = dependencyEnd;
    }
  }

  return latestDependencyEnd;
}

function isRunwayAvailable(runway: Runway, start: Date, end: Date): boolean {
  const runwaySlots = airportState.timeline.filter((slot) => slot.runwayId === runway.id);

  return runwaySlots.every((slot) => {
    return !overlapsWithBuffer(
      start,
      end,
      toDate(slot.start),
      toDate(slot.end),
      runway.wakeBufferMinutes,
    );
  });
}

function findAvailableGate(start: Date, end: Date): Gate | undefined {
  return airportState.gates.find((gate) => {
    if (!gate.isOpen) {
      return false;
    }

    const gateSlots = airportState.timeline.filter((slot) => slot.gateId === gate.id);

    return gateSlots.every((slot) => {
      return !overlapsWithBuffer(start, end, toDate(slot.start), toDate(slot.end), 0);
    });
  });
}

function findFeasibleSlot(flight: Flight): ScheduledSlot | null {
  const requestedStart = toDate(flight.requestedTime);
  const dependencyEnd = getScheduledDependencyEnd(flight);

  if (flight.dependencyFlightIds.length > 0 && !dependencyEnd) {
    return null;
  }

  const earliestStart = dependencyEnd
    ? new Date(
        Math.max(
          requestedStart.getTime(),
          addMinutes(dependencyEnd, DEFAULT_DEPENDENCY_BUFFER_MINUTES).getTime(),
        ),
      )
    : requestedStart;

  const horizonEnd = addMinutes(earliestStart, SCHEDULING_HORIZON_MINUTES);

  for (let cursor = new Date(earliestStart); cursor <= horizonEnd; cursor = addMinutes(cursor, 1)) {
    const start = cursor;
    const end = addMinutes(start, flight.durationMinutes);

    for (const runway of airportState.runways) {
      if (!runway.isOpen || !runwaySupportsFlight(runway, flight)) {
        continue;
      }

      if (!isRunwayAvailable(runway, start, end)) {
        continue;
      }

      const gate = flight.requiresGate ? findAvailableGate(start, end) : undefined;

      if (flight.requiresGate && !gate) {
        continue;
      }

      return {
        flightId: flight.flightId,
        runwayId: runway.id,
        gateId: gate?.id,
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  return null;
}

function sortQueuedFlights(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    const priorityDelta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const dependencyDelta = a.dependencyFlightIds.length - b.dependencyFlightIds.length;

    if (dependencyDelta !== 0) {
      return dependencyDelta;
    }

    return toDate(a.submittedAt).getTime() - toDate(b.submittedAt).getTime();
  });
}

export function generateSchedule(): ScheduleResult {
  resetScheduleState();

  const queuedFlights = sortQueuedFlights(
    airportState.flights.filter((flight) => flight.status === 'queued'),
  );

  for (const flight of queuedFlights) {
    const slot = findFeasibleSlot(flight);

    if (!slot) {
      flight.status = 'unscheduled';
      flight.unscheduledReason =
        flight.dependencyFlightIds.length > 0
          ? 'No feasible slot found or dependency is not scheduled'
          : 'No runway/gate slot available within scheduling horizon';
      continue;
    }

    flight.status = 'scheduled';
    flight.scheduledStart = slot.start;
    flight.scheduledEnd = slot.end;
    flight.assignedRunwayId = slot.runwayId;
    flight.assignedGateId = slot.gateId;

    airportState.timeline.push(slot);
  }

  return {
    scheduled: airportState.flights.filter((flight) => flight.status === 'scheduled'),
    unscheduled: airportState.flights.filter((flight) => flight.status === 'unscheduled'),
    timeline: airportState.timeline,
    generatedAt: new Date().toISOString(),
  };
}

export function analyzeBottlenecks(): BottleneckAnalysis {
  const scheduledFlights = airportState.flights.filter((flight) => flight.status === 'scheduled');
  const queuedFlights = airportState.flights.filter((flight) => flight.status === 'queued');
  const unscheduledFlights = airportState.flights.filter(
    (flight) => flight.status === 'unscheduled',
  );

  const runwayUtilization = airportState.runways.map((runway) => {
    const runwaySlots = airportState.timeline.filter((slot) => slot.runwayId === runway.id);

    const occupiedMinutes = runwaySlots.reduce((total, slot) => {
      return (
        total + Math.round((toDate(slot.end).getTime() - toDate(slot.start).getTime()) / 60_000)
      );
    }, 0);

    return {
      runwayId: runway.id,
      scheduledFlights: runwaySlots.length,
      occupiedMinutes,
    };
  });

  const requiredGateFlights = airportState.flights.filter(
    (flight) => flight.requiresGate && flight.status !== 'cancelled',
  ).length;
  const openGates = airportState.gates.filter((gate) => gate.isOpen).length;

  const likelyBottlenecks: string[] = [];
  const recommendations: string[] = [];

  if (unscheduledFlights.length > 0) {
    likelyBottlenecks.push('Some flights could not be scheduled within the horizon.');
    recommendations.push(
      'Increase scheduling horizon, add runway capacity, or lower separation buffers.',
    );
  }

  if (requiredGateFlights > openGates * 2) {
    likelyBottlenecks.push('Gate demand is high relative to available open gates.');
    recommendations.push(
      'Prioritize gate turnover or allocate remote stands for short-duration flights.',
    );
  }

  const busiestRunway = [...runwayUtilization].sort(
    (a, b) => b.occupiedMinutes - a.occupiedMinutes,
  )[0];

  if (busiestRunway && busiestRunway.occupiedMinutes > 90) {
    likelyBottlenecks.push(`Runway ${busiestRunway.runwayId} has high utilization.`);
    recommendations.push('Balance mixed operations across open runways where operationally safe.');
  }

  if (likelyBottlenecks.length === 0) {
    recommendations.push('No major bottlenecks detected for the current schedule.');
  }

  return {
    generatedAt: new Date().toISOString(),
    airportCode: airportState.airportCode,
    queuedCount: queuedFlights.length,
    scheduledCount: scheduledFlights.length,
    unscheduledCount: unscheduledFlights.length,
    runwayUtilization,
    gateDemand: {
      requiredGateFlights,
      openGates,
    },
    likelyBottlenecks,
    recommendations,
  };
}
