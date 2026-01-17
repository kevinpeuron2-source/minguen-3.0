export enum RaceStatus {
  READY = 'READY',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED'
}

export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  STARTED = 'STARTED',
  FINISHED = 'FINISHED',
  DNF = 'DNF'
}

export enum RaceType {
  GROUP = 'GROUP',
  TIME_TRIAL = 'TIME_TRIAL'
}

export interface Checkpoint {
  id: string;
  name: string;
  distance: number;
  isMandatory: boolean;
}

export interface Participant {
  id: string;
  bib: string;
  firstName: string;
  lastName: string;
  gender: string;
  category: string;
  club?: string;
  city?: string;
  raceId: string;
  status: ParticipantStatus;
  startTime?: number;
}

export interface Passage {
  id: string;
  participantId: string;
  bib: string;
  checkpointId: string;
  checkpointName: string;
  timestamp: number;
  netTime: number;
}

export interface Race {
  id: string;
  name: string;
  distance: number;
  type: RaceType;
  status: RaceStatus;
  startTime?: number;
  checkpoints: Checkpoint[];
  segments?: string[]; // Disciplines (Triathlon style)
  segmentNames?: string[]; // Noms personnalisés des tronçons (ex: "La Montée Noire")
}

export interface SegmentStats {
  label: string;
  duration: string;
  speed: string;
  rankOnSegment: number;
}

export interface RenderReadyResult {
  id: string;
  bib: string;
  fullName: string;
  firstName: string;
  lastName: string;
  category: string;
  gender: string;
  club: string;
  city: string;
  status: ParticipantStatus;
  progress: number;
  rank: number;
  rankGender: number;
  rankCategory: number;
  netTimeMs: number;
  displayTime: string;
  displaySpeed: string;
  lastCheckpointName: string;
  passedCheckpointsCount: number;
  lastTimestamp: number;
  segmentTimes: Record<string, string>; // Temps brut par segment
  splits: SegmentStats[]; // Données enrichies pour l'affichage (Speaker/Results)
}

export interface RaceStats {
  totalEngaged: number;
  finishedCount: number;
  dnfCount: number;
  onTrackCount: number;
}

export interface GlobalCombinedPost {
  id: string;
  name: string;
  assignments: {
    raceId: string;
    raceName: string;
    checkpointId: string;
    checkpointName: string;
  }[];
}

export interface MarshalPresence {
  id: string;
  name: string;
  stationName: string;
  raceId: string;
  checkpointId: string;
  lastActive: number;
}