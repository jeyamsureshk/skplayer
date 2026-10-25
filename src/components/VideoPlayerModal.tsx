import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LocalMedia } from '../types';

interface VideoPlayerModalProps {
  media: LocalMedia | null;
  onClose: () => void;
}

const formatDuration = (ms: number) => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

export default function VideoPlayerModal({ media, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<Video>(null);
  
  // Playback State
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Advanced UI Controls State
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls timer
  const resetHideTimer = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!isPaused && !isSeeking) fadeOutControls();
    }, 3500);
  };

  const fadeInControls = () => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    resetHideTimer();
  };

  const fadeOutControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  };

  const toggleControls = () => {
    if (controlsVisible) {
      fadeOutControls();
    } else {
      fadeInControls();
    }
  };

  // 1. Manage Screen Orientation & Reset state
  useEffect(() => {
    if (media) {
      setIsPaused(false);
      setCurrentTime(0);
      setControlsVisible(true);
      fadeAnim.setValue(1);
      resetHideTimer();
      
      // Unlock screen orientation so the user can rotate to landscape
      ScreenOrientation.unlockAsync();
    }
    
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      // Force lock back to portrait when the player is closed!
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [media]);

  useEffect(() => {
    if (media) resetHideTimer();
  }, [isPaused, isSeeking]);

  // Advanced Skip Features
  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
    resetHideTimer();
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
    resetHideTimer();
  };

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
    resetHideTimer();
  };

  if (!media) return null;

  return (
    <Modal visible={!!media} animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      {/* 2. Added 'left' and 'right' to edges to prevent controls from falling off-screen in landscape mode */}
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom', 'left', 'right']}>
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.playerWrapper}>
            
            <Video 
              ref={videoRef}
              source={{ uri: media.uri }} 
              style={styles.videoView} 
              controls={false}
              resizeMode="contain" 
              paused={isPaused}
              ignoreSilentSwitch="ignore" 
              onLoad={(data) => setDuration(data.duration)}
              onEnd={() => { setIsPaused(true); videoRef.current?.seek(0); setCurrentTime(0); fadeInControls(); }}
              onProgress={(data) => {
                if (!isSeeking) setCurrentTime(data.currentTime);
              }}
            />

            {/* Animated Overlay for all controls */}
            <Animated.View style={[styles.overlayContainer, { opacity: fadeAnim }]} pointerEvents={controlsVisible ? 'box-none' : 'none'}>
              
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>← Done</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1}>{media.title}</Text>
              </View>

              {/* Center Controls (Skip Back, Play/Pause, Skip Forward) */}
              <View style={styles.centerControls} pointerEvents="box-none">
                <TouchableOpacity onPress={skipBackward} style={styles.skipButton}>
                  <Text style={styles.skipText}>↺ 10</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseBtn}>
                  <Image 
                    source={isPaused ? require('@/assets/images/tabIcons/play.png') : require('@/assets/images/tabIcons/pause.png')} 
                    style={styles.controlIconImage} 
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={skipForward} style={styles.skipButton}>
                  <Text style={styles.skipText}>10 ↻</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Timeline Control */}
              <View style={styles.bottomControls}>
                <Text style={styles.timeText}>{formatDuration(currentTime * 1000)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration > 0 ? duration : 1}
                  value={currentTime}
                  minimumTrackTintColor="#4F46E5"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#FFFFFF"
                  onSlidingStart={() => {
                    setIsSeeking(true);
                    if (hideTimeout.current) clearTimeout(hideTimeout.current);
                  }}
                  onValueChange={(val) => setCurrentTime(val)}
                  onSlidingComplete={(val) => {
                    setIsSeeking(false);
                    videoRef.current?.seek(val);
                    resetHideTimer();
                  }}
                />
                <Text style={styles.timeText}>{formatDuration(duration * 1000)}</Text>
              </View>

            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#000' },
  playerWrapper: { flex: 1, justifyContent: 'center', backgroundColor: '#000', position: 'relative' },
  videoView: { width: '100%', height: '100%' }, 
  
  overlayContainer: { ...StyleSheet.absoluteFillObject },

  // Header
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.4)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 12 },
  closeButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Center Controls
  centerControls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  playPauseBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  controlIconImage: { width: 36, height: 36, tintColor: '#FFFFFF', marginLeft: 4 },
  skipButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  skipText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  // Bottom Controls
  bottomControls: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 24, zIndex: 10 },
  slider: { flex: 1, height: 40, marginHorizontal: 12 },
  timeText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], width: 45, textAlign: 'center' },
});
