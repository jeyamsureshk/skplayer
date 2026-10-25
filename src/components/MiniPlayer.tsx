import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, PanResponder, Dimensions } from 'react-native';
import { useAudioPlayback } from './AudioPlaybackProvider';
import AudioPlayerModal from './AudioPlayerModal';
import { AudioArtworkImage } from './AudioArtwork';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYER_WIDTH = SCREEN_WIDTH - 24; 

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function MiniPlayer() {
  const { 
    activeMedia, 
    isPlaying, 
    togglePlayback, 
    skipToNext, 
    skipToPrevious,
    seekTo, 
    position, 
    duration  
  } = useAudioPlayback();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // UI States
  const [isScrubbing, setIsScrubbing] = useState(false); 
  const [isOptimistic, setIsOptimistic] = useState(false); 
  const [scrubProgress, setScrubProgress] = useState(0);
  
  const safePosition = Number(position) || 0;
  const safeDuration = Number(duration) || 1; 

  const startProgress = useRef(0);
  const currentScrubRef = useRef(0);
  const durationRef = useRef(safeDuration);
  const positionRef = useRef(safePosition);
  const seekToRef = useRef(seekTo);
  const seekTimeout = useRef<NodeJS.Timeout | null>(null);

  // Keep refs perfectly synced
  useEffect(() => {
    durationRef.current = safeDuration;
    positionRef.current = safePosition;
    seekToRef.current = seekTo;
  }, [safePosition, safeDuration, seekTo]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger swipe only if moving horizontally more than 10 pixels
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        if (seekTimeout.current) clearTimeout(seekTimeout.current);
        
        setIsScrubbing(true);
        setIsOptimistic(true);
        
        // Lock the start position
        startProgress.current = (positionRef.current / durationRef.current) * 100;
        currentScrubRef.current = startProgress.current;
        setScrubProgress(startProgress.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaPercentage = (gestureState.dx / PLAYER_WIDTH) * 100;
        const newProgress = Math.max(0, Math.min(100, startProgress.current + deltaPercentage));
        
        currentScrubRef.current = newProgress;
        setScrubProgress(newProgress);
      },
      // Release and Terminate now share the same safe exit logic
      onPanResponderRelease: () => handleGestureEnd(),
      onPanResponderTerminate: () => handleGestureEnd(),
    })
  ).current;

  // Extracted logic so cancellations don't break the progress bar
  const handleGestureEnd = () => {
    setIsScrubbing(false); 
    
    if (seekToRef.current) {
      const exactTime = (currentScrubRef.current / 100) * durationRef.current;
      seekToRef.current(exactTime);
    }

    // Hold the bar in place for 1.2 seconds to guarantee the audio player catches up
    seekTimeout.current = setTimeout(() => {
      setIsOptimistic(false);
    }, 1200); 
  };

  useEffect(() => {
    return () => {
      if (seekTimeout.current) clearTimeout(seekTimeout.current);
    };
  }, []);

  if (!activeMedia) return null;

  const currentPercentage = Math.max(0, Math.min(100, (safePosition / safeDuration) * 100));
  const displayPercentage = isOptimistic ? scrubProgress : currentPercentage;
  
  // Note: If your audio provider gives duration in milliseconds, formatTime expects seconds.
  // You might need to divide safeDuration by 1000 here depending on your provider.
  const currentScrubTime = (displayPercentage / 100) * safeDuration;

  return (
    <>
      <View style={styles.container}>
        
        {isScrubbing && (
          <View style={[styles.tooltipContainer, { left: `${displayPercentage}%` }]}>
            <View style={styles.tooltipBadge}>
              <Text style={styles.tooltipText}>{formatTime(currentScrubTime)}</Text>
            </View>
            <View style={styles.tooltipTriangle} />
          </View>
        )}

        <View {...panResponder.panHandlers} style={{ borderRadius: 20 }}>
          {/* FIX: Removed disabled={isOptimistic} so the gesture isn't aborted by the OS */}
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={styles.card}
            onPress={() => {
              // Prevent opening the modal if they are actively scrubbing
              if (!isOptimistic) setIsModalOpen(true);
            }}
          >
            <AudioArtworkImage 
              key={activeMedia.id} 
              uri={activeMedia.uri} 
              size={44} 
              style={styles.artwork} 
            />
            
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{activeMedia.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{activeMedia.artist || 'Unknown Artist'}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlButton} onPress={skipToPrevious} activeOpacity={0.7}>
                <Image 
                  source={require('@/assets/images/tabIcons/next.png')} 
                  style={[styles.iconImage, { transform: [{ rotate: '180deg' }] }]} 
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={togglePlayback} activeOpacity={0.7}>
                <Image 
                  source={isPlaying ? require('@/assets/images/tabIcons/pause.png') : require('@/assets/images/tabIcons/play.png')} 
                  style={styles.iconImage} 
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={skipToNext} activeOpacity={0.7}>
                <Image 
                  source={require('@/assets/images/tabIcons/next.png')} 
                  style={styles.iconImage} 
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Traveling Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${displayPercentage}%`,
                    backgroundColor: isScrubbing ? '#FF4444' : '#8B0000'
                  }
                ]} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <AudioPlayerModal 
        visible={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 85, left: 12, right: 12, zIndex: 999 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 8, paddingRight: 10, borderRadius: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, overflow: 'hidden' },
  artwork: { width: 44, height: 44, borderRadius: 14, marginRight: 10 },
  info: { flex: 1, justifyContent: 'center', paddingRight: 4 },
  title: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  artist: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  controlButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  iconImage: { width: 20, height: 20, tintColor: '#FFFFFF' },
  progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  progressBarFill: { height: '100%' },
  tooltipContainer: { position: 'absolute', bottom: 75, transform: [{ translateX: -25 }], alignItems: 'center', zIndex: 1000 },
  tooltipBadge: { backgroundColor: '#8B0000', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 },
  tooltipText: { color: '#FFF', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tooltipTriangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#8B0000', marginTop: -1 }
});
