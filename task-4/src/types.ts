export type FlightType = 'arrival' | 'departure';
export type FlightPriority = 'low' | 'medium' | 'high';
export type FlightStatus = 'queued' | 'scheduled' | 'cancelled' | 'unscheduled';

export type RunwayCapability = 'arrival' | 'departure' | 'mixed';

export interface Runway {
  id: string;
  name: string;
  capability: RunwayCapability;
  wakeBufferMinutes: number;
  isOpen: boolean;
}

export interface Gate {
  id: string;
  terminal: string;
  isOpen: boolean;
}

export interface FlightRequest {
  flightId: string;
  callsign: string;
  type: FlightType;
  priority: FlightPriority;
  requestedTime: string;
  durationMinutes: number;
  requiresGate: boolean;
  dependencyFlightIds: string[];
}

export interface Flight extends FlightRequest {
  status: FlightStatus;
  submittedAt: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedRunwayId?: string;
  assignedGateId?: string;
  unscheduledReason?: string;
}

export interface ScheduledSlot {
  flightId: string;
  runwayId: string;
  gateId?: string;
  start: string;
  end: string;
}

export interface ScheduleResult {
  scheduled: Flight[];
  unscheduled: Flight[];
  timeline: ScheduledSlot[];
  generatedAt: string;
}

export interface AirportStatus {
  airportCode: string;
  currentTime: string;
  runways: Runway[];
  gates: Gate[];
  queuedFlights: Flight[];
  scheduledFlights: Flight[];
  cancelledFlights: Flight[];
  unscheduledFlights: Flight[];
}

export interface BottleneckAnalysis {
  generatedAt: string;
  airportCode: string;
  queuedCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  runwayUtilization: Array<{
    runwayId: string;
    scheduledFlights: number;
    occupiedMinutes: number;
  }>;
  gateDemand: {
    requiredGateFlights: number;
    openGates: number;
  };
  likelyBottlenecks: string[];
  recommendations: string[];
}
