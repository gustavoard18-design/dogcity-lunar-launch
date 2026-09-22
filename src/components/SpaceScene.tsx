export default function SpaceScene() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a] relative overflow-hidden">
      {/* Stars */}
      {Array.from({ length: 200 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: Math.random() * 0.8 + 0.2,
          }}
        />
      ))}
      
      {/* Nebula effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
    </div>
  );
}
