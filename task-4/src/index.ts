import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  cancelFlightSchema,
  handleAnalyzeBottleneck,
  handleCancelFlight,
  handleGenerateSchedule,
  handleGetAirportStatus,
  handleSubmitFlight,
  submitFlightSchema,
} from './tools.js';
import { getQueueResource, getRunwaysResource, getTimelineResource } from './resources.js';

const server = new McpServer({
  name: 'air-traffic-control-scheduler',
  version: '1.0.0',
});

server.tool(
  'submit_flight',
  'Submit a flight request to the airport scheduling queue.',
  submitFlightSchema,
  async (input) => handleSubmitFlight(input),
);

server.tool(
  'generate_schedule',
  'Generate a deterministic runway and gate schedule for queued flights.',
  {},
  async () => handleGenerateSchedule(),
);

server.tool(
  'get_airport_status',
  'Return current airport state including runways, gates, queued flights, scheduled flights, cancelled flights, and unscheduled flights.',
  {},
  async () => handleGetAirportStatus(),
);

server.tool(
  'cancel_flight',
  'Cancel a submitted or scheduled flight and remove it from the timeline.',
  cancelFlightSchema,
  async (input) => handleCancelFlight(input),
);

server.tool(
  'analyze_bottleneck',
  'Analyze scheduling bottlenecks such as runway utilization, gate demand, and unscheduled flights.',
  {},
  async () => handleAnalyzeBottleneck(),
);

server.resource('airport_queue', 'airport://queue', async () => getQueueResource());

server.resource('airport_runways', 'airport://runways', async () => getRunwaysResource());

server.resource('airport_timeline', 'airport://timeline', async () => getTimelineResource());

const transport = new StdioServerTransport();
await server.connect(transport);
