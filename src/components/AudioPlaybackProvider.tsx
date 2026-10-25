import { createContext, useContext, useEffect, useState } from 'react';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import type { LocalMedia } from '../types';

interface AudioPlaybackContextValue {
  activeMedia: LocalMedia | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playMedia: (media: LocalMedia) => void;
  togglePlayback: () => void;
  close: () => void;
  seekTo: (seconds: number) => Promise<void>;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

export function AudioPlaybackProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeMedia, setActiveMedia] = useState<LocalMedia | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(error => {
      console.error('Failed to configure audio playback:', error);
    });
  }, []);

  const playMedia = (media: LocalMedia) => {
    player.replace(media.uri);
    player.setActiveForLockScreen(true, {
      title: media.title,
      artist: media.artist || 'Unknown Artist',
      albumTitle: media.album || 'Unknown Album',
    });
    setActiveMedia(media);
    player.play();
  };

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const close = () => {
    player.pause();
    player.clearLockScreenControls();
    setActiveMedia(null);
  };

  const seekTo = (seconds: number) => player.seekTo(seconds);

  return (
    <AudioPlaybackContext.Provider
      value={{
        activeMedia,
        currentTime: status.currentTime,
        duration: status.duration,
        isPlaying: status.playing,
        playMedia,
        togglePlayback,
        close,
        seekTo,
      }}
    >
      {children}
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlayback() {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error('useAudioPlayback must be used within an AudioPlaybackProvider');
  }
  return context;
}
