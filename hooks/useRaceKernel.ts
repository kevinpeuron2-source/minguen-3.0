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

    const mandatoryCps = activeRace.checkpoints.filter(cp => cp.isMandatory);
    const mandatoryIds = new Set(mandatoryCps.map(cp => cp.id));
    mandatoryIds.add('finish');
    const totalMandatory = mandatoryIds.size;

    // Prépare les points pour le calcul des tronçons
    const checkpointsOrdered = [...activeRace.checkpoints].sort((a, b) => a.distance - b.distance);
    const pointsSequence = [
      { id: 'start', name: 'Départ' },
      ...checkpointsOrdered,
      { id: 'finish', name: 'Arrivée' }
    ];

    const baseResults: RenderReadyResult[] = participants
      .filter(p => p.raceId === selectedRaceId)
      .map(p => {
        const pPassages = passages
          .filter(pas => pas.participantId === p.id)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        const lastPassage = pPassages[pPassages.length - 1];
        const isFinished = pPassages.some(pas => pas.checkpointId === 'finish');
        const passedMandatory = pPassages.filter(pas => mandatoryIds.has(pas.checkpointId)).length;
        const progress = isFinished ? 100 : (passedMandatory / totalMandatory) * 100;
        
        const netTimeMs = lastPassage?.netTime || 0;
        const lastTimestamp = lastPassage?.timestamp || 0;

        // Calcul des Tronçons (Segment Times)
        const segmentTimes: Record<string, string> = {};
        let lastPointTime = p.startTime || activeRace.startTime || 0;

        pointsSequence.forEach((point, idx) => {
          if (idx === 0) return; // Skip Départ as origin
          
          const passageAtPoint = pPassages.find(pas => pas.checkpointId === point.id);
          const prevPointName = pointsSequence[idx-1].name;
          const label = `${prevPointName} → ${point.name}`;

          if (passageAtPoint) {
            const currentAbsTime = passageAtPoint.timestamp;
            const segmentDuration = currentAbsTime - lastPointTime;
            segmentTimes[label] = formatMsToDisplay(segmentDuration).split('.')[0];
            lastPointTime = currentAbsTime;
          } else {
            segmentTimes[label] = "--:--:--";
          }
        });

        return {
          id: p.id,
          bib: p.bib,
          fullName: `${p.lastName.toUpperCase()} ${p.firstName}`,
          firstName: p.firstName,
          lastName: p.lastName,
          category: p.category,
          gender: p.gender,
          club: p.club || "Individuel",
          city: p.city || "N/A",
          status: p.status,
          progress: Math.round(progress),
          rank: 0,
          rankGender: 0,
          rankCategory: 0,
          netTimeMs,
          displayTime: formatMsToDisplay(netTimeMs),
          displaySpeed: calculateSpeed(activeRace.distance, netTimeMs),
          lastCheckpointName: lastPassage?.checkpointName || "Départ",
          passedCheckpointsCount: passedMandatory,
          lastTimestamp,
          segmentTimes
        } as RenderReadyResult;
      });

    // 1. Tri général
    const sorted = baseResults.sort((a, b) => {
      if (a.passedCheckpointsCount !== b.passedCheckpointsCount) {
        return b.passedCheckpointsCount - a.passedCheckpointsCount;
      }
      return a.lastTimestamp - b.lastTimestamp;
    }).map((item, index) => ({ ...item, rank: index + 1 }));

    // 2. Rangs par Sexe
    const genders = ['M', 'F'];
    genders.forEach(g => {
      let gRank = 1;
      sorted.forEach(item => {
        if (item.gender === g) {
          item.rankGender = gRank++;
        }
      });
    });

    // 3. Rangs par Catégorie
    const cats = Array.from(new Set(sorted.map(s => s.category)));
    cats.forEach(c => {
      let cRank = 1;
      sorted.forEach(item => {
        if (item.category === c) {
          item.rankCategory = cRank++;
        }
      });
    });

    return sorted;
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