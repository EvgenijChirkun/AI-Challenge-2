import type { Gate, Runway } from './types.js';

export const AIRPORT_CODE = 'AIC';

export const SCHEDULING_HORIZON_MINUTES = 180;

export const DEFAULT_DEPENDENCY_BUFFER_MINUTES = 10;

export const RUNWAYS: Runway[] = [
  {
    id: 'RWY-09L',
    name: 'Runway 09 Left',
    capability: 'mixed',
    wakeBufferMinutes: 4,
    isOpen: true,
  },
  {
    id: 'RWY-09R',
    name: 'Runway 09 Right',
    capability: 'mixed',
    wakeBufferMinutes: 4,
    isOpen: true,
  },
  {
    id: 'RWY-18',
    name: 'Runway 18',
    capability: 'departure',
    wakeBufferMinutes: 3,
    isOpen: true,
  },
];

export const GATES: Gate[] = [
  { id: 'A1', terminal: 'A', isOpen: true },
  { id: 'A2', terminal: 'A', isOpen: true },
  { id: 'B1', terminal: 'B', isOpen: true },
  { id: 'B2', terminal: 'B', isOpen: true },
];
