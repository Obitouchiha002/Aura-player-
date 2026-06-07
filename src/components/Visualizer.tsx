import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying } = usePlayerStore();
  const requestRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64; // Fewer bars for performance

    const renderFrame = () => {
      if (!canvas || !ctx) return;

      requestRef.current = requestAnimationFrame(renderFrame);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // Update time for animation
      if (isPlaying) {
        timeRef.current += 0.05;
      }
      
      const time = timeRef.current;

      for (let i = 0; i < bufferLength; i++) {
        // Procedural wave that looks like music (combines sine waves and randomness)
        let barHeight = 2; // default min height

        if (isPlaying) {
          const wave1 = Math.sin(i * 0.2 + time) * 30;
          const wave2 = Math.cos(i * 0.1 - time * 0.8) * 20;
          const noise = Math.random() * 15;
          
          // Add a beat pulse effect
          const beat = Math.sin(time * 2) > 0.8 ? 20 : 0;
          
          barHeight = Math.max(2, wave1 + wave2 + noise + beat + 30);
          
          // Dampen edges
          const edgeDampen = 1 - Math.abs((i - bufferLength / 2) / (bufferLength / 2));
          barHeight *= (0.2 + edgeDampen * 0.8);
        }

        // Soft pastel orange color
        ctx.fillStyle = `rgba(232, 141, 103, ${Math.min(1, barHeight / 100)})`;
        
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };

    renderFrame();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 opacity-80"
    />
  );
}
