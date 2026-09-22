import { DailyMission, DailyMissionState, PlayerProfile } from '../types';

export const DAILY_MISSIONS: DailyMission[] = [
  {
    id: 'launch_3',
    title: 'Explorador Espacial',
    description: 'Realize 3 lançamentos hoje',
    type: 'launches',
    target: 3,
    reward: { stardust: 30, xp: 20 },
    emoji: '🚀',
  },
  {
    id: 'score_200',
    title: 'Precisão Lunar',
    description: 'Alcance 200 pontos em um lançamento',
    type: 'score',
    target: 200,
    reward: { stardust: 50, xp: 35, lunarDust: 2 },
    emoji: '🎯',
  },
  {
    id: 'success_2',
    title: 'Piloto Confiável',
    description: 'Complete 2 missões com sucesso',
    type: 'success',
    target: 2,
    reward: { stardust: 40, xp: 25 },
    emoji: '✅',
  },
];

export function getDailyMissionsForDate(date: Date): DailyMission[] {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  const shuffled = [...DAILY_MISSIONS].sort((a, b) => {
    const hashA = (dayOfYear * 7 + a.id.length * 13) % 100;
    const hashB = (dayOfYear * 7 + b.id.length * 13) % 100;
    return hashA - hashB;
  });
  
  return shuffled.slice(0, 3);
}

export function initializeDailyMissions(profile: PlayerProfile): DailyMissionState[] {
  const now = new Date();
  const lastReset = new Date(profile.lastMissionReset);
  const isNewDay = now.toDateString() !== lastReset.toDateString();
  
  if (isNewDay || profile.dailyMissions.length === 0) {
    const missions = getDailyMissionsForDate(now);
    return missions.map(m => ({
      missionId: m.id,
      progress: 0,
      completed: false,
      claimed: false,
    }));
  }
  
  return profile.dailyMissions;
}

export function updateMissionProgress(
  missions: DailyMissionState[],
  type: 'launches' | 'score' | 'success' | 'route' | 'stardust',
  value: number,
  routeId?: string
): DailyMissionState[] {
  return missions.map(mission => {
    if (mission.completed) return mission;
    
    const missionDef = DAILY_MISSIONS.find(m => m.id === mission.missionId);
    if (!missionDef || missionDef.type !== type) return mission;
    
    let newProgress = mission.progress;
    
    switch (type) {
      case 'launches':
      case 'success':
        newProgress += 1;
        break;
      case 'score':
        newProgress = Math.max(newProgress, value);
        break;
      case 'route':
        if (routeId === 'sea-of-tranquility') newProgress += 1;
        break;
      case 'stardust':
        newProgress += value;
        break;
    }
    
    const completed = newProgress >= missionDef.target;
    
    return { ...mission, progress: newProgress, completed };
  });
}

export function claimMissionReward(
  missionState: DailyMissionState,
  profile: PlayerProfile
): { profile: PlayerProfile; reward: { stardust: number; xp: number; lunarDust: number } } | null {
  if (!missionState.completed || missionState.claimed) return null;
  
  const missionDef = DAILY_MISSIONS.find(m => m.id === missionState.missionId);
  if (!missionDef) return null;
  
  const reward = {
    stardust: missionDef.reward.stardust,
    xp: missionDef.reward.xp,
    lunarDust: missionDef.reward.lunarDust || 0,
  };
  
  const updatedProfile = { ...profile };
  updatedProfile.stardust += reward.stardust;
  updatedProfile.lunarDust += reward.lunarDust;
  updatedProfile.dog = { ...updatedProfile.dog };
  updatedProfile.dog.xp += reward.xp;
  
  return { profile: updatedProfile, reward };
}
