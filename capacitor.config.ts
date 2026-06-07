import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.auramusic.app',
  appName: 'Aura Music Player',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
