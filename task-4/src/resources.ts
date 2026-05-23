import { airportState } from './state.js';
import type { ScheduledSlot } from './types.js';

function toJsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function getQueueResource() {
  const queuedFlights = airportState.flights.filter((flight) => flight.status === 'queued');

  return {
    contents: [
      {
        uri: 'airport://queue',
        mimeType: 'application/json',
        text: toJsonText(queuedFlights),
      },
    ],
  };
}

export function getRunwaysResource() {
  return {
    contents: [
      {
        uri: 'airport://runways',
        mimeType: 'application/json',
        text: toJsonText(airportState.runways),
      },
    ],
  };
}

export function getTimelineResource() {
  const timeline: ScheduledSlot[] = airportState.flights
    .filter((flight) => {
      return (
        flight.status === 'scheduled' &&
        Boolean(flight.scheduledStart) &&
        Boolean(flight.scheduledEnd) &&
        Boolean(flight.assignedRunwayId)
      );
    })
    .map((flight) => {
      const slot: ScheduledSlot = {
        flightId: flight.flightId,
        type: flight.type,
        runwayId: flight.assignedRunwayId!,
        start: flight.scheduledStart!,
        end: flight.scheduledEnd!,
      };

      if (flight.assignedGateId) {
        slot.gateId = flight.assignedGateId;
      }

      return slot;
    })
    .sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

  return {
    contents: [
      {
        uri: 'airport://timeline',
        mimeType: 'application/json',
        text: toJsonText(timeline),
      },
    ],
  };
}
