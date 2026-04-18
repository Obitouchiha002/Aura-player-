import { usePlayerStore } from '../store/usePlayerStore';

export const triggerHaptic = (type?: 'light' | 'medium' | 'heavy') => {
  const { hapticsEnabled, hapticIntensity } = usePlayerStore.getState();
  if (!hapticsEnabled || !navigator.vibrate) return;
  
  const finalType = type || hapticIntensity;
  
  try {
    switch(finalType) {
      case 'light': 
        navigator.vibrate(10); 
        break;
      case 'medium': 
        navigator.vibrate(30); 
        break;
      case 'heavy': 
        navigator.vibrate([40, 30, 40]); 
        break;
    }
  } catch (error) {
    // Ignore errors on devices that don't support vibration
  }
};
