import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { NativeModules } from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import type { LocalMedia } from '../types';

const { AudioArtwork } = NativeModules;

interface AudioPlaybackContextValue {
  activeMedia: LocalMedia | null;
  currentTime: number;
  position: number;
  duration: number;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playMedia: (media: LocalMedia, queue?: LocalMedia[]) => void;
  togglePlayback: () => void;
  close: () => void;
  seekTo: (time: number) => void; 
  skipToNext: () => void;
  skipToPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void; // <-- ADDED: Volume control
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

const shuffleArray = (array: LocalMedia[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [originalQueue, setOriginalQueue] = useState<LocalMedia[]>([]);
  const [activeQueue, setActiveQueue] = useState<LocalMedia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const activeMedia = currentIndex >= 0 && activeQueue.length > currentIndex 
    ? activeQueue[currentIndex] 
    : null;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(error => {
      console.error('Failed to configure audio playback:', error);
    });
  }, []);

  const loadTrack = useCallback(async (media: LocalMedia) => {
    player.replace(media.uri);
    player.play();

    player.setActiveForLockScreen(true, {
      title: media.title,
      artist: media.artist || 'Unknown Artist',
      albumTitle: media.album || 'Unknown Album',
    });

    if (AudioArtwork) {
      try {
        const artworkPath = await AudioArtwork.getArtwork(media.uri);
        if (artworkPath) {
          player.setActiveForLockScreen(true, {
            title: media.title,
            artist: media.artist || 'Unknown Artist',
            albumTitle: media.album || 'Unknown Album',
            artworkUrl: artworkPath, 
          });
        }
      } catch (error) {
        // Silently ignore if extraction fails
      }
    }
  }, [player]);

  const playMedia = useCallback((media: LocalMedia, newQueue?: LocalMedia[]) => {
    let targetQueue = activeQueue;

    if (newQueue && newQueue.length > 0) {
      setOriginalQueue(newQueue);
      
      if (isShuffle) {
        targetQueue = shuffleArray(newQueue);
        const itemIndex = targetQueue.findIndex(m => m.id === media.id);
        if (itemIndex > -1) {
          targetQueue.splice(itemIndex, 1);
          targetQueue.unshift(media);
        }
      } else {
        targetQueue = newQueue;
      }
      setActiveQueue(targetQueue);
    }

    const index = targetQueue.findIndex(m => m.id === media.id);
    setCurrentIndex(index !== -1 ? index : 0);
    void loadTrack(media);
  }, [activeQueue, isShuffle, loadTrack]);

  const skipToNext = useCallback(() => {
    if (activeQueue.length === 0) return;
    
    if (repeatMode === 'one') {
      player.seekTo(0);
      player.play();
      return;
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= activeQueue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0; 
      } else {
        player.pause(); 
        return;
      }
    }
    
    setCurrentIndex(nextIndex);
    void loadTrack(activeQueue[nextIndex]);
  }, [activeQueue, currentIndex, repeatMode, player, loadTrack]);

  const skipToPrevious = useCallback(() => {
    if (activeQueue.length === 0) return;
    
    if (status.currentTime > 3000) { // Fix: Check milliseconds instead of 3
      player.seekTo(0);
      return;
    }
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = repeatMode === 'all' ? activeQueue.length - 1 : 0;
    }
    
    setCurrentIndex(prevIndex);
    void loadTrack(activeQueue[prevIndex]);
  }, [activeQueue, currentIndex, repeatMode, status.currentTime, player, loadTrack]);

  useEffect(() => {
    if (status.didJustFinish) {
      skipToNext();
    }
  }, [status.didJustFinish, skipToNext]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const nextShuffle = !prev;
      if (activeMedia) {
        if (nextShuffle) {
          const remaining = originalQueue.filter(m => m.id !== activeMedia.id);
          const newShuffled = [activeMedia, ...shuffleArray(remaining)];
          setActiveQueue(newShuffled);
          setCurrentIndex(0);
        } else {
          setActiveQueue(originalQueue);
          setCurrentIndex(Math.max(0, originalQueue.findIndex(m => m.id === activeMedia.id)));
        }
      }
      return nextShuffle;
    });
  }, [activeMedia, originalQueue]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  }, []);

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
    setActiveQueue([]);
    setCurrentIndex(-1);
  };

  const seekTo = (time: number) => {
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(time);
    }
  };

  // <-- ADDED: Function to control native audio volume (0.0 to 1.0)
  const setVolume = useCallback((volumeLevel: number) => {
    if (player) {
      player.volume = volumeLevel; 
    }
  }, [player]);

  return (
    <AudioPlaybackContext.Provider
      value={{
        activeMedia,
        currentTime: status.currentTime,
        position: status.currentTime,
        duration: status.duration,
        isPlaying: status.playing,
        isShuffle,
        repeatMode,
        playMedia,
        togglePlayback,
        close,
        seekTo,
        skipToNext,
        skipToPrevious,
        toggleShuffle,
        toggleRepeat,
        setVolume // <-- Exported to context
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
