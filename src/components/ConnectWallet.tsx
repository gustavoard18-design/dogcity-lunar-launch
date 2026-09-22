import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { WalletConnection } from '../lib/wallet';
import { connectWallet } from '../lib/wallet';
import SpaceScene3D from './SpaceScene3D';

interface ConnectWalletProps {
  onConnect: (wallet: WalletConnection) => void;
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const wallet = await connectWallet();
      onConnect(wallet);
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background 3D */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-gradient-to-b from-[#0a0a1a] to-[#1a0a2e]" />}>
          <SpaceScene3D />
        </Suspense>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 1 }}
            className="text-8xl mb-8"
          >
            🐕‍🦺🚀
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-4"
          >
            DogCity
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-300 mb-8 text-lg"
          >
            Conecte sua carteira Bitcoin e comece sua jornada espacial!
          </motion.p>
          
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-5 px-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xl transition-all disabled:opacity-50 shadow-xl"
          >
            {connecting ? 'Conectando...' : '🔗 Conectar Wallet'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
