# Task 4 — Air Traffic Control MCP Server

## Overview

This task implements an MCP server for an AI-ready Air Traffic Control scheduling system.

The server exposes tools and resources that allow an AI client to submit flights, generate airport schedules, inspect airport state, cancel flights, and analyze bottlenecks.

The implementation is built with:

- Node.js
- TypeScript
- `@modelcontextprotocol/sdk`
- `zod`

## Features

- MCP server over stdio
- Flight submission tool
- Deterministic runway/gate scheduler
- Airport status inspection
- Flight cancellation
- Bottleneck analysis
- MCP resources for queue, runways, and timeline
- In-memory airport state for challenge/demo usage

## Tools

### `submit_flight`

Submits a flight request to the scheduling queue.

Input fields:

- `flightId`
- `callsign`
- `type`: `arrival` or `departure`
- `priority`: `low`, `medium`, or `high`
- `requestedTime`: ISO-8601 datetime
- `durationMinutes`
- `requiresGate`
- `dependencyFlightIds`

### `generate_schedule`

Generates a deterministic schedule for queued flights.

The scheduler considers:

- priority
- requested time
- runway capability
- runway separation buffer
- gate availability
- flight dependencies
- scheduling horizon

### `get_airport_status`

Returns current airport state, including:

- runways
- gates
- queued flights
- scheduled flights
- cancelled flights
- unscheduled flights

### `cancel_flight`

Cancels a submitted or scheduled flight.

### `analyze_bottleneck`

Analyzes likely airport bottlenecks, including:

- unscheduled flights
- runway utilization
- gate demand
- operational recommendations

## Resources

### `airport://queue`

Returns queued flights.

### `airport://runways`

Returns configured runways.

### `airport://timeline`

Returns the generated schedule timeline.

## Scheduling approach

The scheduler uses a deterministic greedy algorithm.

Queued flights are sorted by:

1. Priority: high → medium → low
2. Number of dependencies
3. Submission time

For each flight, the scheduler finds the earliest feasible slot within the scheduling horizon.

A slot is feasible when:

- the runway is open
- the runway supports the flight type
- runway separation buffer is respected
- required dependencies are already scheduled
- required gate is available
- the slot fits within the scheduling horizon

If no feasible slot is found, the flight is marked as `unscheduled` with a reason.

## Installation

From the `task-4` directory:

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
npm run dev
```

or after build:

```bash
npm start
```

The server runs over stdio and is intended to be launched by an MCP-compatible client.

## Example MCP client configuration

Example configuration for a local MCP client:

```json
{
  "mcpServers": {
    "air-traffic-control-scheduler": {
      "command": "node",
      "args": ["C:/Projects/AI-Challenge-2/task-4/dist/index.js"]
    }
  }
}
```

For development with `tsx`:

```json
{
  "mcpServers": {
    "air-traffic-control-scheduler": {
      "command": "npx",
      "args": ["tsx", "C:/Projects/AI-Challenge-2/task-4/src/index.ts"]
    }
  }
}
```

## Example workflow

1. Submit flights with `submit_flight`.
2. Run `generate_schedule`.
3. Inspect `airport://timeline`.
4. Run `analyze_bottleneck`.
5. Cancel a flight with `cancel_flight` if needed.

## Limitations

- State is stored in memory only.
- The scheduler is deterministic and explainable, but not globally optimal.
- No real ATC data is used.
- This is a challenge/demo implementation, not a safety-critical aviation system.
