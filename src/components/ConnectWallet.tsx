import { useState } from 'react';
import { motion } from 'framer-motion';
import { WalletConnection } from '../lib/wallet';
import { connectWallet } from '../lib/wallet';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a]">
      <div className="max-w-md w-full text-center p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-8xl mb-8"
        >
          🐕‍🦺🚀
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
        >
          DogCity
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 mb-8"
        >
          Conecte sua carteira Bitcoin e comece sua jornada espacial!
        </motion.p>
        
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleConnect}
          disabled={connecting}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50"
        >
          {connecting ? 'Conectando...' : '🔗 Conectar Wallet'}
        </motion.button>
      </div>
    </div>
  );
}
