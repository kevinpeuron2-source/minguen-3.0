import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, RenderReadyResult, RaceStats, ParticipantStatus, SegmentStats } from '../types';
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

    const checkpointsOrdered = [...activeRace.checkpoints].sort((a, b) => a.distance - b.distance);
    const pointsSequence = [
      { id: 'start', name: 'Départ', distance: 0 },
      ...checkpointsOrdered,
      { id: 'finish', name: 'Arrivée', distance: activeRace.distance }
    ];

    const segmentNames = activeRace.segmentNames || pointsSequence.slice(1).map((p, i) => `${pointsSequence[i].name} → ${p.name}`);

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

        const segmentTimes: Record<string, string> = {};
        const splits: SegmentStats[] = [];
        let lastPointTime = p.startTime || activeRace.startTime || 0;
        let lastPointDist = 0;

        pointsSequence.forEach((point, idx) => {
          if (idx === 0) return;
          
          const passageAtPoint = pPassages.find(pas => pas.checkpointId === point.id);
          const label = segmentNames[idx - 1] || `${pointsSequence[idx-1].name} → ${point.name}`;

          if (passageAtPoint) {
            const currentAbsTime = passageAtPoint.timestamp;
            const segmentDuration = currentAbsTime - lastPointTime;
            const segmentDist = point.distance - lastPointDist;
            
            segmentTimes[label] = formatMsToDisplay(segmentDuration).split('.')[0];
            splits.push({
              label,
              duration: formatMsToDisplay(segmentDuration).split('.')[0],
              speed: calculateSpeed(segmentDist, segmentDuration),
              rankOnSegment: 0 // Will be computed after mapping all
            });
            lastPointTime = currentAbsTime;
            lastPointDist = point.distance;
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
          segmentTimes,
          splits
        } as RenderReadyResult;
      });

    // Tri et Rangs
    const sorted = baseResults.sort((a, b) => {
      if (a.passedCheckpointsCount !== b.passedCheckpointsCount) {
        return b.passedCheckpointsCount - a.passedCheckpointsCount;
      }
      // Use netTimeMs for sorting if available, otherwise fallback to lastTimestamp
      if (a.netTimeMs > 0 && b.netTimeMs > 0) {
        return a.netTimeMs - b.netTimeMs;
      }
      return a.lastTimestamp - b.lastTimestamp;
    }).map((item, index) => ({ ...item, rank: index + 1 }));

    // Rangs par Sexe
    ['M', 'F'].forEach(g => {
      let gRank = 1;
      sorted.forEach(item => { if (item.gender === g) item.rankGender = gRank++; });
    });

    // Rangs par Catégorie
    const cats = Array.from(new Set(sorted.map(s => s.category)));
    cats.forEach(c => {
      let cRank = 1;
      sorted.forEach(item => { if (item.category === c) item.rankCategory = cRank++; });
    });

    // Calcul des rangs par segment
    segmentNames.forEach((name) => {
        const finishersOfSegment = sorted
            .filter(r => r.segmentTimes[name] && r.segmentTimes[name] !== "--:--:--")
            .sort((a, b) => {
                const parse = (s: string) => {
                    const [h, m, s_] = s.split(':').map(Number);
                    return h * 3600 + m * 60 + s_;
                };
                return parse(a.segmentTimes[name]) - parse(b.segmentTimes[name]);
            });
        
        finishersOfSegment.forEach((r, idx) => {
            const split = r.splits.find(s => s.label === name);
            if (split) split.rankOnSegment = idx + 1;
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

  const refreshRanking = useCallback(async () => {
    if (kernelResults.length === 0) return;
    
    const batch = writeBatch(db);
    kernelResults.forEach(r => {
      const ref = doc(db, 'participants', r.id);
      batch.update(ref, {
        rank: r.rank,
        rankCategory: r.rankCategory,
        rankGender: r.rankGender
      });
    });

    try {
      await batch.commit();
      console.log('Rangs recalculés et mis à jour dans Firebase');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des rangs:', error);
    }
  }, [kernelResults]);

  return { kernelResults, stats, races, isSyncing, refreshRanking };
};