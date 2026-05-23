import { airportState } from './state.js';

function toJsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function getQueueResource() {
  return {
    contents: [
      {
        uri: 'airport://queue',
        mimeType: 'application/json',
        text: toJsonText(airportState.flights.filter((flight) => flight.status === 'queued')),
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
  return {
    contents: [
      {
        uri: 'airport://timeline',
        mimeType: 'application/json',
        text: toJsonText(airportState.timeline),
      },
    ],
  };
}
