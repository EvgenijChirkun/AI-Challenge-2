import { airportState } from './state.js';

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
  const activeTimeline = airportState.timeline.filter((slot) => {
    const flight = airportState.flights.find((item) => item.flightId === slot.flightId);

    return flight?.status === 'scheduled';
  });

  return {
    contents: [
      {
        uri: 'airport://timeline',
        mimeType: 'application/json',
        text: toJsonText(activeTimeline),
      },
    ],
  };
}
