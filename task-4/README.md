# Task 4 — Air Traffic Control MCP Server

## Overview

This task implements a lightweight Model Context Protocol (MCP) server for an AI-ready Air Traffic Control scheduling system.

The server accepts incoming flight plans, generates deterministic runway and gate schedules, tracks airport state, handles cancellations, and exposes operational data to MCP-compatible AI clients through tools and resources.

The focus is scheduling logic and coordination. This is not a real aviation system and must not be used for safety-critical operations.

## Technology stack

- Node.js
- TypeScript
- `@modelcontextprotocol/sdk`
- `zod`
- MCP stdio transport

## Features

- MCP server over stdio
- Flight submission for arrivals and departures
- Priority-aware deterministic scheduling
- Dependency-aware scheduling
- Runway capability and minimum runway length checks
- Runway separation buffers for arrivals, departures, and mixed operations
- Gate availability and turnaround buffer handling
- Configurable airport limits through environment variables
- Airport status reporting with counts and resource usage
- Flight cancellation
- Timeline resources that exclude cancelled flights
- Bottleneck analysis with runway utilization, gate demand, and longest scheduled dependency chain

## Project structure

```text
task-4/
├── src/
│   ├── config.ts
│   ├── index.ts
│   ├── resources.ts
│   ├── scheduler.ts
│   ├── state.ts
│   ├── tools.ts
│   └── types.ts
├── README.md
├── report.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

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

For development:

```bash
npm run dev
```

After building:

```bash
npm start
```

The server runs over stdio and is intended to be launched by an MCP-compatible client.

## MCP client configuration

Example local MCP client configuration using the compiled server:

```json
{
  "mcpServers": {
    "air-traffic-control-scheduler": {
      "command": "node",
      "args": ["./task-4/dist/index.js"]
    }
  }
}
```

Example development configuration using `tsx`:

```json
{
  "mcpServers": {
    "air-traffic-control-scheduler": {
      "command": "npx",
      "args": ["tsx", "./task-4/src/index.ts"]
    }
  }
}
```

The examples assume the MCP client is launched from the repository root. If your client uses another working directory, replace the relative path with the appropriate absolute path.

## Environment variables

Airport limits and scheduling parameters are loaded from environment variables.

All variables are optional because the server provides safe demo defaults. Invalid values fail clearly at startup.

| Variable                       | Accepted values                                           | Default                 | Description                                              |
| ------------------------------ | --------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| `AIRPORT_CODE`                 | non-empty string                                          | `AIC`                   | Airport code used in status and analysis responses       |
| `RUNWAY_COUNT`                 | positive integer                                          | `3`                     | Number of runways to generate                            |
| `GATE_COUNT`                   | positive integer                                          | `4`                     | Number of gates to generate                              |
| `GROUND_CREW_COUNT`            | positive integer                                          | `2`                     | Number of available ground crew units reported in status |
| `ARRIVAL_SEPARATION_MINUTES`   | positive integer                                          | `4`                     | Runway buffer for arrival operations                     |
| `DEPARTURE_SEPARATION_MINUTES` | positive integer                                          | `3`                     | Runway buffer for departure operations                   |
| `MIXED_SEPARATION_MINUTES`     | positive integer                                          | `4`                     | Runway buffer for mixed operations                       |
| `GATE_TURNAROUND_MINUTES`      | non-negative integer                                      | `15`                    | Gate turnaround buffer between gate-using flights        |
| `DEPENDENCY_BUFFER_MINUTES`    | non-negative integer                                      | `10`                    | Required delay after a dependency flight completes       |
| `SCHEDULING_HORIZON_MINUTES`   | positive integer                                          | `180`                   | Maximum search horizon for each flight slot              |
| `RUNWAY_CAPABILITIES`          | comma-separated `arrival`, `departure`, or `mixed` values | `mixed,mixed,departure` | Per-runway operation capability                          |
| `RUNWAY_LENGTHS_METERS`        | comma-separated positive integers                         | `3200,3200,2600`        | Per-runway length used for minimum runway length checks  |

### Example

PowerShell:

```powershell
$env:RUNWAY_COUNT="2"
$env:GATE_COUNT="3"
$env:DEPENDENCY_BUFFER_MINUTES="12"
$env:RUNWAY_CAPABILITIES="mixed,departure"
$env:RUNWAY_LENGTHS_METERS="3200,2600"
npm run dev
```

Command Prompt:

```cmd
set RUNWAY_COUNT=2
set GATE_COUNT=3
set DEPENDENCY_BUFFER_MINUTES=12
set RUNWAY_CAPABILITIES=mixed,departure
set RUNWAY_LENGTHS_METERS=3200,2600
npm run dev
```

## MCP tools

### `submit_flight`

Submits a new flight request to the airport queue.

Input fields:

| Field                   | Type                       | Required | Description                                          |
| ----------------------- | -------------------------- | -------- | ---------------------------------------------------- |
| `flightId`              | string                     | yes      | Unique flight identifier, for example `FL-1001`      |
| `callsign`              | string                     | yes      | Flight callsign, for example `AIC101`                |
| `type`                  | `arrival` or `departure`   | yes      | Operation type                                       |
| `priority`              | `high`, `medium`, or `low` | yes      | Scheduling priority                                  |
| `requestedTime`         | ISO-8601 datetime string   | yes      | Requested operation start time                       |
| `durationMinutes`       | positive integer           | yes      | Expected runway slot duration                        |
| `requiresGate`          | boolean                    | yes      | Whether the flight needs a gate assignment           |
| `dependencyFlightIds`   | string array               | no       | Flights that must complete before this flight starts |
| `minRunwayLengthMeters` | positive integer           | no       | Optional minimum runway length requirement           |

Example:

```json
{
  "flightId": "FL-1001",
  "callsign": "AIC101",
  "type": "arrival",
  "priority": "high",
  "requestedTime": "2026-05-17T12:00:00.000Z",
  "durationMinutes": 12,
  "requiresGate": true,
  "dependencyFlightIds": []
}
```

### `generate_schedule`

Generates or refreshes the current airport schedule.

Calling this tool replaces the current generated schedule with a freshly computed one based on the current non-cancelled flight queue and airport configuration.

The scheduler considers:

- flight priority
- requested time
- runway capability
- optional minimum runway length
- runway separation buffers
- gate availability
- gate turnaround buffers
- dependency completion
- dependency buffer
- scheduling horizon

### `get_airport_status`

Returns structured operational airport status.

The response includes:

- runways
- gates
- queued flights
- scheduled flights
- cancelled flights
- unscheduled flights
- counts by state
- counts by operation type
- runway and gate usage
- configured ground crew count
- schedule completion time when available

### `cancel_flight`

Cancels a submitted or scheduled flight.

Input:

```json
{
  "flightId": "FL-1002"
}
```

The cancelled flight is marked as `cancelled`, removed from the active schedule timeline, and remains visible in airport status.

### `analyze_bottleneck`

Returns bottleneck analysis including:

- queued count
- scheduled count
- unscheduled count
- runway utilization
- gate demand
- longest active scheduled dependency chain
- likely bottlenecks
- operational recommendations

The longest dependency chain is computed from scheduled flights and reports the ordered chain plus total elapsed time from the first flight start to the final flight end.

## MCP resources

### `airport://queue`

Returns the current queued flights.

This resource is useful before schedule generation to inspect submitted but not-yet-scheduled flights.

### `airport://runways`

Returns runway configuration, including capability, length, and separation buffers.

### `airport://timeline`

Returns a chronological timeline of scheduled airport operations.

The timeline is derived from currently scheduled flights. Cancelled flights are excluded.

## Scheduling approach

The scheduler uses a deterministic greedy algorithm.

Flights are sorted by:

1. Priority: `high` → `medium` → `low`
2. Number of dependencies
3. Submission time

For each flight, the scheduler finds the earliest feasible slot within the configured scheduling horizon.

A slot is feasible when:

- the runway is open
- the runway supports the operation type
- the runway satisfies the flight minimum runway length, if provided
- the runway separation buffer is respected
- a required gate is available
- gate turnaround buffer is respected
- dependencies are already scheduled
- dependency buffer is respected
- the full operation end time is inside the scheduling horizon

Flights with dependencies that are not scheduled yet are deferred and retried in later scheduling passes.

Flights are marked `unscheduled` only when:

- a dependency is missing
- a dependency is cancelled
- a dependency could not be scheduled
- no feasible runway/gate slot exists inside the scheduling horizon
- a dependency cycle or unresolved dependency prevents progress

Repeated scheduling with the same inputs and configuration is deterministic.

## Validation scenarios

### Scenario 1 — Morning Rush

Submit mixed arrivals and departures with different priorities, then generate the schedule.

Expected:

- all schedulable flights are scheduled
- runway and gate overlaps are avoided
- higher-priority flights are scheduled earlier when resources are contested
- queue/status clearly show scheduled or unscheduled state

### Scenario 2 — Heavy Hauler

Submit a flight with `minRunwayLengthMeters` greater than all configured runway lengths.

Expected:

- the oversized flight is not scheduled
- the flight remains visible as `unscheduled`
- the unscheduled reason indicates no suitable runway is available

### Scenario 3 — Connecting Flight

Submit an inbound arrival and an outbound departure that depends on it.

Expected:

- both flights are scheduled if resources are available
- the outbound flight starts after the inbound flight completes
- the configured dependency buffer is respected
- the timeline makes the dependency order clear

## Manual testing

The project was tested with:

```bash
npm run build
```

Manual MCP testing was performed with MCP Inspector and a small local MCP client script.

Verified:

- `get_airport_status` returns the initial airport state
- `submit_flight` accepts valid flight requests
- empty `dependencyFlightIds` values are normalized correctly
- `generate_schedule` creates runway/gate timeline slots
- flight dependencies are respected
- `airport://queue` returns queued flights before scheduling
- `airport://runways` returns runway configuration
- `airport://timeline` returns `[]` before scheduling
- `airport://timeline` returns scheduled operations after schedule generation
- `analyze_bottleneck` returns utilization, gate demand, dependency-chain analysis, and recommendations
- `cancel_flight` changes flight status to `cancelled`
- `airport://timeline` excludes cancelled flights after cancellation

## Known limitations

- State is stored in memory only.
- The scheduler is deterministic and explainable, but not globally optimal.
- Airport entities are generated from configuration rather than loaded from a database.
- The system does not model real aircraft physics, taxiways, weather, airspace sectors, or real ATC procedures.
- This project is not suitable for real aviation operations or safety-critical use.

## Safety note

This project is a demo scheduling assistant for an AI challenge.

No real ATC, passenger, aircraft, airline, or airport operational data is included.

Do not use this system for real-world aviation decisions.

## Result

The final implementation satisfies the main Task 4 requirements:

- MCP server starts successfully
- tools are accessible from an MCP-compatible client
- resources are accessible from an MCP-compatible client
- airport limits are configurable through environment variables
- arrivals and departures can be submitted with priorities and dependencies
- scheduling avoids runway and gate conflicts
- scheduling respects runway requirements, gate availability, separation buffers, dependency buffers, and scheduling horizon
- unscheduled flights remain visible with clear reasons
- cancellation updates airport state
- airport status returns structured operational data
- bottleneck analysis identifies dependency-chain duration and resource usage
- repeated scheduling is deterministic
