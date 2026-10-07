export const DEFAULT_REASONS = [
  'Guest at reception',
  'Urgent client call',
  'Client on hold',
  'Need you at my desk',
  'Come to cabin',
  'Urgent — call me now',
];

export const MAX_REASONS = 8;
export const MAX_NOTE_LENGTH = 40;
export const REBUZZ_TIMEOUT_MS = 60000;
export const NO_RESPONSE_TIMEOUT_MS = 120000;
export const PRESENCE_TIMEOUT_MS = 120000; // 2 minutes
export const BUZZ_SOUND_DURATION_MS = 15000;

export const NOTIFICATION_CHANNEL_ID = 'openmalo_buzz';
export const NOTIFICATION_CHANNEL_NAME = 'OpenMalo Buzz';

export const COLLECTIONS = {
  USERS: 'users',
  BUZZES: 'buzzes',
  REASONS: 'reasons',
  SETTINGS: 'settings',
} as const;
