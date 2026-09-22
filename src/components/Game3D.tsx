import { Route } from '../types';
import { calculateSuccessChance } from '../lib/economy';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpaceScene3D from './SpaceScene3D';

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
        }, 3000);
      }, 2500);
    }
  };

  return (
    <div className="relative w-full h-[700px] rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-2xl">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-gradient-to-b from-[#0a0a1a] to-[#1a0a2e]" />}>
          <SpaceScene3D phase={phase} power={power} />
        </Suspense>
      </div>

      {/* HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Route Info */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-6 left-6 glass-dark px-6 py-4 rounded-2xl pointer-events-auto"
        >
          <div className="text-2xl font-bold text-white mb-1">{route.emoji} {route.name}</div>
          <div className="text-sm text-gray-300">
            Dificuldade: {'★'.repeat(route.difficulty)}{'☆'.repeat(4 - route.difficulty)}
          </div>
          <div className="text-xs text-purple-400 mt-1">
            Custo: ✨{route.cost} | Max: {route.maxScore}pts
          </div>
        </motion.div>

        {/* Stats */}
        {dogStats && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-6 right-6 glass-dark px-6 py-4 rounded-2xl pointer-events-auto"
          >
            <div className="text-sm font-bold text-white mb-2">Stats do Cão</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>🔥</span>
                <span className="text-orange-400">Power: {dogStats.power}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span className="text-blue-400">Accuracy: {dogStats.accuracy}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🍀</span>
                <span className="text-green-400">Luck: {dogStats.luck}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💨</span>
                <span className="text-cyan-400">Speed: {dogStats.speed}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
              >
                <motion.button
                  whileHover={{ scale: 1.1, boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLaunch}
                  className="px-12 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white rounded-2xl font-bold text-2xl shadow-2xl animate-pulse-glow"
                >
                  🎯 Mirar
                </motion.button>
              </motion.div>
            )}
            
            {phase === 'aiming' && (
              <motion.div
                key="aiming"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="glass-dark p-8 rounded-3xl min-w-[400px]"
              >
                <div className="text-white text-center mb-4">
                  <div className="text-3xl font-bold mb-2">Power: {Math.round(power)}%</div>
                  <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-6 rounded-full relative overflow-hidden"
                      style={{ width: `${power}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <label className="text-white text-sm font-bold">Ângulo:</label>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    value={angle}
                    onChange={(e) => setAngle(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-white text-xl font-bold w-16 text-right">{angle}°</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(168, 85, 247, 0.8)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLaunch}
                  className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white rounded-2xl font-bold text-2xl shadow-2xl animate-gradient"
                >
                  🚀 LANÇAR!
                </motion.button>
              </motion.div>
            )}
            
            {phase === 'flying' && (
              <motion.div
                key="flying"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="glass-dark px-12 py-8 rounded-3xl text-center"
              >
                <div className="text-6xl mb-4 animate-float">🚀</div>
                <div className="text-white text-3xl font-bold animate-pulse">
                  Voando...
                </div>
              </motion.div>
            )}
            
            {phase === 'landed' && showResult && (
              <motion.div
                key="landed"
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', duration: 0.8 }}
                className="glass-dark px-12 py-8 rounded-3xl text-center min-w-[400px]"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.5 }}
                  className="text-8xl mb-4"
                >
                  {success ? '🎉' : '💥'}
                </motion.div>
                <div className="text-white font-black text-4xl mb-2">
                  {success ? 'Sucesso!' : 'Falha!'}
                </div>
                <div className="text-yellow-400 text-3xl font-bold">
                  Score: {finalScore}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cancel Button */}
        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="absolute bottom-6 right-6 px-6 py-3 glass-dark hover:bg-red-900/50 text-white rounded-xl text-sm font-bold pointer-events-auto transition-colors"
        >
          ← Cancelar
        </motion.button>
      </div>
    </div>
  );
}
