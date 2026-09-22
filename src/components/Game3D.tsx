import { Route } from '../types';
import { calculateSuccessChance } from '../lib/economy';
import { useState, useEffect } from 'react';

interface Game3DProps {
  route: Route;
  onComplete: (score: number, success: boolean) => void;
  onCancel: () => void;
  dogStats?: { power: number; accuracy: number; luck: number; speed: number };
}

export default function Game3D({ route, onComplete, onCancel, dogStats }: Game3DProps) {
  const [phase, setPhase] = useState<'idle' | 'aiming' | 'flying' | 'landed'>('idle');
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(45);
  const [showResult, setShowResult] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (phase !== 'aiming') return;
    
    const powerStat = dogStats?.power || 1;
    const chargeSpeed = 1 + powerStat * 0.3;
    const maxPower = 80 + powerStat * 5;
    
    const interval = setInterval(() => {
      setPower(prev => Math.min(prev + chargeSpeed, maxPower));
    }, 30);

    return () => clearInterval(interval);
  }, [phase, dogStats]);

  const handleLaunch = () => {
    if (phase === 'idle') {
      setPhase('aiming');
    } else if (phase === 'aiming' && power > 0) {
      setPhase('flying');
      
      // Simulate flight and scoring
      setTimeout(() => {
        const luck = dogStats?.luck || 1;
        const accuracy = dogStats?.accuracy || 1;
        const baseScore = Math.floor((power / 100) * route.maxScore * (accuracy / 5));
        const score = Math.min(baseScore, route.maxScore);
        const successChance = calculateSuccessChance(score, route, luck);
        const isSuccess = Math.random() < successChance;
        
        setFinalScore(score);
        setSuccess(isSuccess);
        setShowResult(true);
        setPhase('landed');
        
        setTimeout(() => {
          onComplete(score, isSuccess);
        }, 2000);
      }, 2000);
    }
  };

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a] rounded-2xl overflow-hidden border-2 border-purple-500/30">
      {/* Background stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Target */}
      <div className="absolute top-20 right-20 w-20 h-20 border-4 border-yellow-400 rounded-full animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-yellow-400 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 bg-yellow-400 rounded-full" />
        </div>
      </div>

      {/* Rocket */}
      <div className="absolute bottom-20 left-20 text-6xl animate-bounce">
        🚀
      </div>

      {/* HUD */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white">
        <div className="text-sm font-bold">{route.emoji} {route.name}</div>
        <div className="text-xs text-gray-300">
          Dificuldade: {'★'.repeat(route.difficulty)}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm p-4 rounded-xl">
        {phase === 'idle' && (
          <button
            onClick={handleLaunch}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
          >
            🎯 Mirar
          </button>
        )}
        
        {phase === 'aiming' && (
          <div className="space-y-3">
            <div className="text-white text-center">
              Power: {Math.round(power)}%
            </div>
            <div className="w-64 bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full transition-all"
                style={{ width: `${power}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Ângulo:</label>
              <input
                type="range"
                min="15"
                max="80"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-white text-sm w-12">{angle}°</span>
            </div>
            <button
              onClick={handleLaunch}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold"
            >
              🚀 LANÇAR!
            </button>
          </div>
        )}
        
        {phase === 'flying' && (
          <div className="text-white text-center text-lg animate-pulse">
            🚀 Voando...
          </div>
        )}
        
        {phase === 'landed' && showResult && (
          <div className="text-center">
            <div className="text-4xl mb-2">{success ? '🎉' : '💥'}</div>
            <div className="text-white font-bold text-lg">
              {success ? 'Sucesso!' : 'Falha!'}
            </div>
            <div className="text-yellow-400 text-sm">Score: {finalScore}</div>
          </div>
        )}
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg text-sm"
      >
        ← Cancelar
      </button>
    </div>
  );
}
