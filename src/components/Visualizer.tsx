import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

// We need to keep the AudioContext outside so it's not recreated
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying } = usePlayerStore();
  const requestRef = useRef<number>();

  useEffect(() => {
    const audioElement = document.getElementById('main-media') as HTMLMediaElement;
    if (!audioElement) return;

    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 256;
      } catch (e) {
        console.error("AudioContext error", e);
      }
    }

    if (audioCtx && audioCtx.state === 'suspended' && isPlaying) {
      audioCtx.resume();
    }

    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!canvas || !ctx || !analyser) return;

      requestRef.current = requestAnimationFrame(renderFrame);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Soft pastel orange color
        ctx.fillStyle = `rgba(232, 141, 103, ${barHeight / 150})`;
        
        // Draw rounded bars
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth + 1;
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
