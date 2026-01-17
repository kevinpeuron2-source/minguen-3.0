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
  city?: string; // Ajout de la ville
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
  segments?: string[];
}

/**
 * Interface Maîtresse : RenderReadyResult
 * Objet aplati prêt pour le DOM et l'Export Excel
 */
export interface RenderReadyResult {
  id: string;
  bib: string;
  fullName: string;
  firstName: string;
  lastName: string;
  category: string;
  gender: string;
  club: string;
  city: string; // Ajout de la ville
  status: ParticipantStatus;
  progress: number; // 0-100
  rank: number;
  rankGender: number; // Rang par sexe
  rankCategory: number; // Rang par catégorie
  netTimeMs: number;
  displayTime: string; // HH:mm:ss.SS
  displaySpeed: string; // XX.XX km/h
  lastCheckpointName: string;
  passedCheckpointsCount: number;
  lastTimestamp: number;
  segmentTimes: Record<string, string>; // Temps par tronçon (ex: "Départ - CP1": "00:12:04")
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