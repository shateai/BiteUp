/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useSpring } from "motion/react";
import React, { useEffect, useState, useMemo } from "react";

export default function App() {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  
  // World coordinates (where the player is in the "world")
  const [worldX, setWorldX] = useState(0);
  const [worldY, setWorldY] = useState(0);

  // Smooth springs for satisfying background movement
  const springConfig = { damping: 30, stiffness: 150 };
  const viewX = useSpring(0, springConfig);
  const viewY = useSpring(0, springConfig);

  // Update animated view coordinates when world position changes
  useEffect(() => {
    viewX.set(-worldX);
    viewY.set(-worldY);
  }, [worldX, worldY, viewX, viewY]);

  // Generate a static field of nodes once
  const staticNodes = useMemo(() => {
    return [...Array(60)].map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 2000, // Wide spread
      y: (Math.random() - 0.5) * 2000,
      type: Math.random() > 0.8 ? 'blue' : 'red' as 'blue' | 'red',
      size: Math.random() * 8 + 4
    }));
  }, []);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setShowMenu(true);
    }
    setLastTap(now);
  };

  const MOVE_STEP = 120;

  const handleSwipe = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (dir === 'left') setWorldX(prev => prev - MOVE_STEP);
    if (dir === 'right') setWorldX(prev => prev + MOVE_STEP);
    if (dir === 'up') setWorldY(prev => prev - MOVE_STEP);
    if (dir === 'down') setWorldY(prev => prev + MOVE_STEP);
  };

  // Touch/Mouse tracking for 4-way swipes
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

  const onStart = (clientX: number, clientY: number) => {
    handleDoubleTap();
    setTouchStart({ x: clientX, y: clientY });
    setIsPressed(true);
  };

  const onEnd = (clientX: number, clientY: number) => {
    if (touchStart !== null) {
      const diffX = clientX - touchStart.x;
      const diffY = clientY - touchStart.y;
      const threshold = 30;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > threshold) handleSwipe('right');
        else if (diffX < -threshold) handleSwipe('left');
      } else {
        if (diffY > threshold) handleSwipe('down');
        else if (diffY < -threshold) handleSwipe('up');
      }
    }
    setTouchStart(null);
    setIsPressed(false);
  };

  // Collision/Interaction logic (Check periodically or on movement)
  useEffect(() => {
    const timer = setInterval(() => {
      // Find nodes close to 0,0 (player center)
      staticNodes.forEach(node => {
        const dist = Math.sqrt(Math.pow(node.x - worldX, 2) + Math.pow(node.y - worldY, 2));
        if (dist < 40 && node.type === 'blue') {
          // In a real game we'd remove it, here we just count "encounters"
          // for a satisfying "satisfying" feel, let's keep it simple
        }
      });
    }, 100);
    return () => clearInterval(timer);
  }, [worldX, worldY, staticNodes]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#020617] select-none touch-none flex items-center justify-center font-sans">
      {/* Deep Stars/Parallax Background */}
      <motion.div 
        style={{ x: viewX.get() * 0.2, y: viewY.get() * 0.2 }}
        className="absolute inset-0 opacity-10 pointer-events-none"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e3a8a_0%,_transparent_70%)] scale-150" />
      </motion.div>

      {/* Main Container */}
      <motion.div 
        className="relative w-full max-w-[375px] h-full max-h-[720px] mx-4 bg-black/60 border border-blue-500/20 rounded-[50px] shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col items-center"
        onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={(e) => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onMouseUp={(e) => onEnd(e.clientX, e.clientY)}
      >
        {/* HUD */}
        <div className="absolute top-12 left-0 right-0 px-10 flex justify-between items-center z-30">
          <div className="flex flex-col">
            <span className="text-blue-400/60 uppercase tracking-[0.4em] text-[10px] font-medium">Coordinate</span>
            <span className="text-lg font-light text-blue-50/80">{Math.round(worldX)}, {Math.round(worldY)}</span>
          </div>
          <motion.div className="w-10 h-10 border border-blue-500/20 rounded-full flex items-center justify-center">
             <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_5px_white]" />
          </motion.div>
        </div>

        {/* Exploration Area */}
        <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
          {/* World Coordinates Moving Layer */}
          <motion.div 
            style={{ x: viewX, y: viewY }}
            className="absolute"
          >
            {staticNodes.map(node => (
              <div
                key={node.id}
                className={`absolute rounded-full blur-[1px] transition-opacity duration-1000 ${
                  node.type === 'red' ? 'bg-red-500/80 shadow-[0_0_15px_#ef4444]' : 'bg-blue-300 shadow-[0_0_20px_#3b82f6]'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.size,
                  height: node.size,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </motion.div>

          {/* Player Light (Centered) */}
          <div className="relative z-20">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[20px]" />
              <motion.div 
                animate={{ 
                  scale: isPressed ? 1.1 : [1, 1.05, 1],
                  rotate: isPressed ? [0, 10, -10, 0] : 0
                }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-12 h-12 bg-blue-400 rounded-full border-2 border-white/40 shadow-[0_0_40px_rgba(59,130,246,0.6)] flex items-center justify-center overflow-hidden"
              >
                <div className="w-full h-full bg-gradient-to-br from-blue-300 via-blue-600 to-blue-900 opacity-95" />
              </motion.div>
              {/* Rotating outer rings */}
              <div className="absolute inset-[-6px] border border-blue-400/10 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-[-12px] border border-blue-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>
          </div>
        </div>

        {/* Start/Instruction Overlay */}
        {!gameActive && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center px-10">
            <h2 className="text-3xl font-extralight text-blue-50 mb-4 tracking-tight">Ethereal Explorer</h2>
            <p className="text-blue-200/60 text-sm italic mb-10 leading-relaxed font-light">"Pohybuj se švihem v prázdnotě. Dvojitý klik pro vstup do jádra."</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setGameActive(true)}
              className="px-12 py-4 bg-blue-600/20 border border-blue-400/40 rounded-full text-blue-100 text-sm tracking-[0.2em] uppercase"
            >
              Vstoupit
            </motion.button>
          </div>
        )}

        {/* Modern Menu Overlay */}
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl z-50 flex flex-col items-center justify-center px-6"
          >
            <div className="text-blue-400/60 uppercase tracking-[0.4em] text-[10px] font-medium mb-12">
              System Core
            </div>
            
            <div className="grid grid-cols-1 gap-4 w-full">
              {[
                { title: 'Resume', desc: 'Return to existence' },
                { title: 'Navigation', desc: 'Calibration complete' },
                { title: 'Dimension', desc: 'Shift reality' }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => i === 0 && setShowMenu(false)}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-light text-blue-50">{card.title}</span>
                    <span className="text-xs text-blue-400/40">{card.desc}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/5 bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#3b82f6]" />
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button 
              onClick={() => setShowMenu(false)}
              className="mt-12 text-blue-400/40 uppercase tracking-[0.3em] text-[10px] border-b border-transparent hover:border-blue-400/20 transition-all"
            >
              Deactivate Menu
            </motion.button>
          </motion.div>
        )}

        {/* Home Indicator */}
        <div className="absolute bottom-4 w-24 h-1 bg-white/10 rounded-full"></div>
      </motion.div>
    </div>
  );
}
