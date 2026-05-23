import { DEFAULT_DEPENDENCY_BUFFER_MINUTES, SCHEDULING_HORIZON_MINUTES } from './config.js';
import { airportState, resetScheduleState } from './state.js';
import type {
  BottleneckAnalysis,
  Flight,
  FlightPriority,
  FlightType,
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

type DependencyStatus =
  | {
      state: 'ready';
      latestDependencyEnd: Date | null;
    }
  | {
      state: 'waiting';
      reason: string;
    }
  | {
      state: 'blocked';
      reason: string;
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

function minutesBetween(start: string, end: string): number {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60_000);
}

function getRunwayBufferMinutes(
  runway: Runway,
  candidateType: FlightType,
  existingType: FlightType,
): number {
  if (candidateType !== existingType) {
    return runway.separationBuffers.mixedMinutes;
  }

  if (candidateType === 'arrival') {
    return runway.separationBuffers.arrivalMinutes;
  }

  return runway.separationBuffers.departureMinutes;
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
  const supportsOperation = runway.capability === 'mixed' || runway.capability === flight.type;

  if (!supportsOperation) {
    return false;
  }

  if (flight.minRunwayLengthMeters && runway.lengthMeters < flight.minRunwayLengthMeters) {
    return false;
  }

  return true;
}

function getDependencyStatus(flight: Flight): DependencyStatus {
  if (flight.dependencyFlightIds.length === 0) {
    return {
      state: 'ready',
      latestDependencyEnd: null,
    };
  }

  let latestDependencyEnd: Date | null = null;

  for (const dependencyFlightId of flight.dependencyFlightIds) {
    const dependency = airportState.flights.find((item) => item.flightId === dependencyFlightId);

    if (!dependency) {
      return {
        state: 'blocked',
        reason: `Dependency flight ${dependencyFlightId} was not found`,
      };
    }

    if (dependency.status === 'cancelled') {
      return {
        state: 'blocked',
        reason: `Dependency flight ${dependencyFlightId} was cancelled`,
      };
    }

    if (dependency.status === 'unscheduled') {
      return {
        state: 'blocked',
        reason: `Dependency flight ${dependencyFlightId} could not be scheduled`,
      };
    }

    if (dependency.status !== 'scheduled' || !dependency.scheduledEnd) {
      return {
        state: 'waiting',
        reason: `Dependency flight ${dependencyFlightId} is not scheduled yet`,
      };
    }

    const dependencyEnd = toDate(dependency.scheduledEnd);

    if (!latestDependencyEnd || dependencyEnd > latestDependencyEnd) {
      latestDependencyEnd = dependencyEnd;
    }
  }

  return {
    state: 'ready',
    latestDependencyEnd,
  };
}

function isRunwayAvailable(runway: Runway, flight: Flight, start: Date, end: Date): boolean {
  const runwaySlots = airportState.timeline.filter((slot) => slot.runwayId === runway.id);

  return runwaySlots.every((slot) => {
    const bufferMinutes = getRunwayBufferMinutes(runway, flight.type, slot.type);

    return !overlapsWithBuffer(start, end, toDate(slot.start), toDate(slot.end), bufferMinutes);
  });
}

function findAvailableGate(start: Date, end: Date): Gate | undefined {
  return airportState.gates.find((gate) => {
    if (!gate.isOpen) {
      return false;
    }

    const gateSlots = airportState.timeline.filter((slot) => slot.gateId === gate.id);

    return gateSlots.every((slot) => {
      return !overlapsWithBuffer(
        start,
        end,
        toDate(slot.start),
        toDate(slot.end),
        gate.turnaroundMinutes,
      );
    });
  });
}

function findFeasibleSlot(flight: Flight, latestDependencyEnd: Date | null): ScheduledSlot | null {
  const requestedStart = toDate(flight.requestedTime);

  const earliestStart = latestDependencyEnd
    ? new Date(
        Math.max(
          requestedStart.getTime(),
          addMinutes(latestDependencyEnd, DEFAULT_DEPENDENCY_BUFFER_MINUTES).getTime(),
        ),
      )
    : requestedStart;

  const horizonEnd = addMinutes(earliestStart, SCHEDULING_HORIZON_MINUTES);

  for (let cursor = new Date(earliestStart); cursor <= horizonEnd; cursor = addMinutes(cursor, 1)) {
    const start = cursor;
    const end = addMinutes(start, flight.durationMinutes);

    if (end > horizonEnd) {
      continue;
    }

    for (const runway of airportState.runways) {
      if (!runway.isOpen || !runwaySupportsFlight(runway, flight)) {
        continue;
      }

      if (!isRunwayAvailable(runway, flight, start, end)) {
        continue;
      }

      const gate = flight.requiresGate ? findAvailableGate(start, end) : undefined;

      if (flight.requiresGate && !gate) {
        continue;
      }

      return {
        flightId: flight.flightId,
        type: flight.type,
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

function sortTimelineByStart(timeline: ScheduledSlot[]): ScheduledSlot[] {
  return [...timeline].sort((a, b) => {
    return toDate(a.start).getTime() - toDate(b.start).getTime();
  });
}

function markUnscheduled(flight: Flight, reason: string): void {
  flight.status = 'unscheduled';
  flight.unscheduledReason = reason;
  delete flight.scheduledStart;
  delete flight.scheduledEnd;
  delete flight.assignedRunwayId;
  delete flight.assignedGateId;
}

function scheduleFlight(flight: Flight, slot: ScheduledSlot): void {
  flight.status = 'scheduled';
  flight.scheduledStart = slot.start;
  flight.scheduledEnd = slot.end;
  flight.assignedRunwayId = slot.runwayId;
  flight.assignedGateId = slot.gateId;

  airportState.timeline.push(slot);
}

export function generateSchedule(): ScheduleResult {
  resetScheduleState();

  let pendingFlights = sortQueuedFlights(
    airportState.flights.filter((flight) => flight.status === 'queued'),
  );

  while (pendingFlights.length > 0) {
    const deferredFlights: Flight[] = [];
    let madeProgress = false;

    for (const flight of pendingFlights) {
      const dependencyStatus = getDependencyStatus(flight);

      if (dependencyStatus.state === 'waiting') {
        deferredFlights.push(flight);
        continue;
      }

      if (dependencyStatus.state === 'blocked') {
        markUnscheduled(flight, dependencyStatus.reason);
        madeProgress = true;
        continue;
      }

      const slot = findFeasibleSlot(flight, dependencyStatus.latestDependencyEnd);

      if (!slot) {
        const reason = flight.minRunwayLengthMeters
          ? `No suitable runway available for minimum length ${flight.minRunwayLengthMeters} meters`
          : 'No runway/gate slot available within scheduling horizon';

        markUnscheduled(flight, reason);
        madeProgress = true;
        continue;
      }

      scheduleFlight(flight, slot);
      madeProgress = true;
    }

    if (!madeProgress) {
      for (const flight of deferredFlights) {
        markUnscheduled(flight, 'Dependency cycle or unresolved dependency prevented scheduling');
      }

      break;
    }

    pendingFlights = sortQueuedFlights(deferredFlights);
  }

  return {
    scheduled: airportState.flights.filter((flight) => flight.status === 'scheduled'),
    unscheduled: airportState.flights.filter((flight) => flight.status === 'unscheduled'),
    timeline: sortTimelineByStart(airportState.timeline),
    generatedAt: new Date().toISOString(),
  };
}

function findLongestDependencyChain(): BottleneckAnalysis['longestDependencyChain'] {
  const scheduledFlights = airportState.flights.filter(
    (flight) => flight.status === 'scheduled' && flight.scheduledStart && flight.scheduledEnd,
  );

  const scheduledById = new Map(scheduledFlights.map((flight) => [flight.flightId, flight]));

  const memo = new Map<string, Flight[]>();

  function buildChain(flight: Flight): Flight[] {
    const cached = memo.get(flight.flightId);

    if (cached) {
      return cached;
    }

    const dependencyChains = flight.dependencyFlightIds
      .map((dependencyFlightId) => scheduledById.get(dependencyFlightId))
      .filter((dependency): dependency is Flight => Boolean(dependency))
      .map((dependency) => buildChain(dependency));

    const longestDependencyChain = dependencyChains.sort((a, b) => b.length - a.length)[0];

    const chain = longestDependencyChain ? [...longestDependencyChain, flight] : [flight];

    memo.set(flight.flightId, chain);
    return chain;
  }

  const chains = scheduledFlights.map((flight) => buildChain(flight));
  const longestChain =
    chains.sort((a, b) => {
      const aElapsed = getChainElapsedMinutes(a);
      const bElapsed = getChainElapsedMinutes(b);
      return bElapsed - aElapsed;
    })[0] ?? [];

  return {
    totalElapsedMinutes: getChainElapsedMinutes(longestChain),
    flights: longestChain.map((flight) => ({
      flightId: flight.flightId,
      callsign: flight.callsign,
      type: flight.type,
      scheduledStart: flight.scheduledStart!,
      scheduledEnd: flight.scheduledEnd!,
    })),
  };
}

function getChainElapsedMinutes(chain: Flight[]): number {
  if (chain.length === 0) {
    return 0;
  }

  const first = chain[0];
  const last = chain.at(-1);

  if (!first?.scheduledStart || !last?.scheduledEnd) {
    return 0;
  }

  return minutesBetween(first.scheduledStart, last.scheduledEnd);
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
      return total + minutesBetween(slot.start, slot.end);
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

  const longestDependencyChain = findLongestDependencyChain();

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

  if (longestDependencyChain.flights.length > 1) {
    likelyBottlenecks.push('A scheduled dependency chain drives part of the timeline.');
    recommendations.push(
      'Review dependent flight turnaround assumptions and dependency buffer settings.',
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
    longestDependencyChain,
    likelyBottlenecks,
    recommendations,
  };
}
