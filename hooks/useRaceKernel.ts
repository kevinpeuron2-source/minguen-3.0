import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, RenderReadyResult, RaceStats, ParticipantStatus } from '../types';
import { formatMsToDisplay, calculateSpeed } from '../utils/formatters';

export const useRaceKernel = (selectedRaceId: string) => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const unsubRaces = onSnapshot(collection(db, 'races'), (snap) => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    });

    const unsubParts = onSnapshot(collection(db, 'participants'), (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });

    const qPassages = query(collection(db, 'passages'), orderBy('timestamp', 'asc'));
    const unsubPassages = onSnapshot(qPassages, (snap) => {
      setPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
      setIsSyncing(false);
    });

    return () => {
      unsubRaces();
      unsubParts();
      unsubPassages();
    };
  }, []);

  const kernelResults = useMemo<RenderReadyResult[]>(() => {
    const activeRace = races.find(r => r.id === selectedRaceId);
    if (!activeRace) return [];

    const mandatoryIds = new Set(activeRace.checkpoints.filter(cp => cp.isMandatory).map(cp => cp.id));
    mandatoryIds.add('finish');
    const totalMandatory = mandatoryIds.size;

    const results: RenderReadyResult[] = participants
      .filter(p => p.raceId === selectedRaceId)
      .map(p => {
        const pPassages = passages.filter(pas => pas.participantId === p.id);
        const lastPassage = pPassages[pPassages.length - 1];
        const isFinished = pPassages.some(pas => pas.checkpointId === 'finish');
        
        // Calcul progression
        const passedMandatory = pPassages.filter(pas => mandatoryIds.has(pas.checkpointId)).length;
        const progress = isFinished ? 100 : (passedMandatory / totalMandatory) * 100;
        
        const netTimeMs = lastPassage?.netTime || 0;
        const lastTimestamp = lastPassage?.timestamp || 0;

        return {
          id: p.id,
          bib: p.bib,
          fullName: `${p.lastName.toUpperCase()} ${p.firstName}`,
          firstName: p.firstName,
          lastName: p.lastName,
          category: p.category,
          gender: p.gender,
          club: p.club || "Individuel",
          status: p.status,
          progress: Math.round(progress),
          rank: 0,
          netTimeMs,
          displayTime: formatMsToDisplay(netTimeMs),
          displaySpeed: calculateSpeed(activeRace.distance, netTimeMs),
          lastCheckpointName: lastPassage?.checkpointName || "Départ",
          passedCheckpointsCount: passedMandatory,
          lastTimestamp
        } as RenderReadyResult;
      });

    // Algorithme de tri vectoriel : 
    // 1. Plus grand nombre de CP validés d'abord
    // 2. Si égalité, celui qui a le timestamp le plus faible au dernier CP validé
    return results
      .sort((a, b) => {
        if (a.passedCheckpointsCount !== b.passedCheckpointsCount) {
          return b.passedCheckpointsCount - a.passedCheckpointsCount;
        }
        return a.lastTimestamp - b.lastTimestamp;
      })
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [races, participants, passages, selectedRaceId]);

  const stats = useMemo<RaceStats>(() => {
    return {
      totalEngaged: kernelResults.length,
      finishedCount: kernelResults.filter(r => r.status === ParticipantStatus.FINISHED).length,
      dnfCount: kernelResults.filter(r => r.status === ParticipantStatus.DNF).length,
      onTrackCount: kernelResults.filter(r => r.status === ParticipantStatus.STARTED).length,
    };
  }, [kernelResults]);

  return { kernelResults, stats, races, isSyncing };
};