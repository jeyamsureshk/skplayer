import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Image, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayback } from './AudioPlaybackProvider';
import { AudioArtworkImage } from './AudioArtwork';

// 1. Import the Playlist Modal we built earlier
import AddToPlaylistModal from './AddToPlaylistModal';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 48;

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function AudioPlayerModal({ visible, onClose }: AudioPlayerModalProps) {
  const { 
    activeMedia, currentTime, duration, isPlaying, 
    togglePlayback, seekTo, skipToNext, skipToPrevious,
    isShuffle, repeatMode, toggleShuffle, toggleRepeat,
    setVolume: setSystemVolume
  } = useAudioPlayback();
  
  const [isSliderSeeking, setIsSliderSeeking] = useState(false);
  const [sliderSeekTime, setSliderSeekTime] = useState(0);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(0); 
  
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const [volume, setVolume] = useState(1); 
  const [isLiked, setIsLiked] = useState(false);

  // 2. Add state to control the Playlist Modal
  const [isPlaylistModalVisible, setIsPlaylistModalVisible] = useState(false);

  const safeCurrentTime = Number(currentTime) || 0;
  const safeDuration = Number(duration) || 1;

  const durationRef = useRef(safeDuration);
  const positionRef = useRef(safeCurrentTime);
  const seekToRef = useRef(seekTo);
  const togglePlaybackRef = useRef(togglePlayback);
  const setSystemVolumeRef = useRef(setSystemVolume);
  
  const activeGestureRef = useRef<'horizontal' | 'vertical' | null>(null);
  const startProgress = useRef(0);
  const currentScrubRef = useRef(0);
  const startVolumeRef = useRef(1);
  const currentVolumeRef = useRef(1);
  
  const lastTapRef = useRef(0);
  const seekTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    durationRef.current = safeDuration;
    positionRef.current = safeCurrentTime;
    seekToRef.current = seekTo;
    togglePlaybackRef.current = togglePlayback;
    setSystemVolumeRef.current = setSystemVolume;
  }, [safeCurrentTime, safeDuration, seekTo, togglePlayback, setSystemVolume]);

  useEffect(() => {
    return () => {
      if (seekTimeout.current) clearTimeout(seekTimeout.current);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, 
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        if (seekTimeout.current) clearTimeout(seekTimeout.current);
        activeGestureRef.current = null; 
        
        startProgress.current = (positionRef.current / durationRef.current) * 100;
        currentScrubRef.current = startProgress.current;
        setScrubProgress(startProgress.current);
        
        startVolumeRef.current = currentVolumeRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!activeGestureRef.current) {
          if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
            activeGestureRef.current = 'horizontal';
            setIsScrubbing(true);
            setIsOptimistic(true);
          } else {
            activeGestureRef.current = 'vertical';
            setIsAdjustingVolume(true);
          }
        }

        if (activeGestureRef.current === 'horizontal') {
          const deltaPercentage = (gestureState.dx / ARTWORK_SIZE) * 100;
          const newProgress = Math.max(0, Math.min(100, startProgress.current + deltaPercentage));
          
          currentScrubRef.current = newProgress;
          setScrubProgress(newProgress);
        }
        
        if (activeGestureRef.current === 'vertical') {
          const deltaVolume = -(gestureState.dy / (ARTWORK_SIZE / 1.5)); 
          let newVolume = startVolumeRef.current + deltaVolume;
          newVolume = Math.max(0, Math.min(newVolume, 1));
          
          currentVolumeRef.current = newVolume;
          setVolume(newVolume);

          if (setSystemVolumeRef.current) {
            setSystemVolumeRef.current(newVolume);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (activeGestureRef.current === 'horizontal') {
          setIsScrubbing(false);
          if (seekToRef.current) {
            const exactTime = (currentScrubRef.current / 100) * durationRef.current;
            seekToRef.current(exactTime);
          }
          
          seekTimeout.current = setTimeout(() => {
            setIsOptimistic(false);
          }, 1200); 
        } 
        else if (activeGestureRef.current === 'vertical') {
          setIsAdjustingVolume(false);
        } 
        else {
          if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300; 
            
            if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
              togglePlaybackRef.current(); 
              lastTapRef.current = 0; 
            } else {
              lastTapRef.current = now; 
            }
          }
        }
        activeGestureRef.current = null;
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
        setIsAdjustingVolume(false);
        activeGestureRef.current = null;
        
        seekTimeout.current = setTimeout(() => {
          setIsOptimistic(false);
        }, 1200);
      },
    })
  ).current;

  useEffect(() => {
    if (!activeMedia) return;
    const loadLikedState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(`@liked_track_${activeMedia.id}`);
        setIsLiked(storedValue === 'true');
      } catch (error) {
        console.error('Failed to load liked state:', error);
      }
    };
    loadLikedState();
  }, [activeMedia]);

  const toggleLike = async () => {
    if (!activeMedia) return;
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      await AsyncStorage.setItem(`@liked_track_${activeMedia.id}`, newLikedState.toString());
    } catch (error) {
      console.error('Failed to save liked state:', error);
    }
  };

  if (!activeMedia) return null;

  const currentPercentage = Math.max(0, Math.min(100, (safeCurrentTime / safeDuration) * 100));
  const activePercentage = isOptimistic ? scrubProgress : currentPercentage;
  const optimisticScrubTime = (activePercentage / 100) * safeDuration;
  
  const displayTime = isOptimistic ? optimisticScrubTime : (isSliderSeeking ? sliderSeekTime : safeCurrentTime);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        
        {/* --- GLOBAL SWIPE BACKGROUND LAYER --- */}
        {/* This sits exactly behind everything and perfectly catches all swipes and empty-space taps */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        
        <View style={styles.header} pointerEvents="box-none">
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel} pointerEvents="none">Playing from your library</Text>
          <View style={styles.headerSpacer} pointerEvents="none" />
        </View>
        
        <View style={styles.content} pointerEvents="box-none">
          
          <View style={styles.artworkContainer} pointerEvents="none">
            <View style={styles.imageWrapper}>
              <AudioArtworkImage 
                key={activeMedia.id || activeMedia.uri} 
                uri={activeMedia.uri} 
                size={ARTWORK_SIZE} 
                style={styles.artworkImage} 
              />
            </View>

            {isAdjustingVolume && (
              <View style={styles.gestureOverlay} pointerEvents="none">
                <Ionicons 
                  name={volume === 0 ? "volume-mute" : volume > 0.5 ? "volume-high" : "volume-low"} 
                  size={50} 
                  color="#FFF" 
                />
                <Text style={styles.overlayText}>{Math.round(volume * 100)}%</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow} pointerEvents="box-none">
            <View style={styles.textColumn} pointerEvents="none">
              <Text style={styles.title} numberOfLines={1}>{activeMedia.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{activeMedia.artist || 'Unknown Artist'}</Text>
            </View>
            
            <View style={styles.actionButtonsRow} pointerEvents="box-none">
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsPlaylistModalVisible(true)}>
                <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={toggleLike} activeOpacity={0.6}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#FF4444" : "#FFFFFF"} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.progressContainer} pointerEvents="box-none">
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={safeDuration > 0 ? safeDuration : 1}
              value={displayTime} 
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#FFFFFF"
              onSlidingStart={() => {
                setIsSliderSeeking(true);
                setSliderSeekTime(safeCurrentTime);
              }}
              onValueChange={(val) => setSliderSeekTime(val)}
              onSlidingComplete={(val) => {
                seekTo(val);
                setIsSliderSeeking(false);
              }}
            />
            <View style={styles.timeRow} pointerEvents="none">
              <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
              <Text style={styles.timeText}>{formatDuration(safeDuration)}</Text> 
            </View>
          </View>

          <View style={styles.controlsRow} pointerEvents="box-none">
            <TouchableOpacity onPress={toggleShuffle} style={[styles.secondaryBtn, isShuffle && styles.activeBtn]}>
              <Image source={require('@/assets/images/tabIcons/shuffle.png')} style={styles.secondaryIconImage} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipToPrevious} style={styles.primaryBtn}>
              <Image source={require('@/assets/images/tabIcons/next.png')} style={[styles.primaryIconImage, { transform: [{ rotate: '180deg' }] }]} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayback} style={styles.playPauseBtn} activeOpacity={0.8}>
              <Image source={isPlaying ? require('@/assets/images/tabIcons/pause.png') : require('@/assets/images/tabIcons/play.png')} style={styles.playPauseImage} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipToNext} style={styles.primaryBtn}>
              <Image source={require('@/assets/images/tabIcons/next.png')} style={styles.primaryIconImage} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRepeat} style={[styles.secondaryBtn, repeatMode !== 'off' && styles.activeBtn]}>
              <View>
                <Image source={require('@/assets/images/tabIcons/repeat.png')} style={styles.secondaryIconImage} resizeMode="contain" />
                {repeatMode === 'one' && (
                  <View style={styles.repeatOneBadge}>
                    <Text style={styles.repeatOneText}>1</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

        </View>
        
        {/* 4. Mount the Playlist Modal */}
        <AddToPlaylistModal 
          visible={isPlaylistModalVisible} 
          mediaItem={activeMedia} 
          onClose={() => setIsPlaylistModalVisible(false)} 
        />
        
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerLabel: { color: '#AAAAAA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  headerSpacer: { width: 40 }, 

  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'space-between' },
  
  artworkContainer: { width: ARTWORK_SIZE, height: ARTWORK_SIZE, alignSelf: 'center', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, position: 'relative' },
  
  imageWrapper: { width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' },
  artworkImage: { width: '100%', height: '100%' }, 

  gestureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 20 },
  overlayText: { color: '#FFF', fontSize: 32, fontWeight: 'bold', fontVariant: ['tabular-nums'], marginTop: 8 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  textColumn: { flex: 1, paddingRight: 10 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  artist: { color: '#AAAAAA', fontSize: 18, fontWeight: '500' },
  
  // FIX: Added actionButtonsRow to hold both icons neatly
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionButton: { padding: 4 },

  progressContainer: { marginBottom: 20 },
  slider: { width: '100%', height: 40, marginHorizontal: 0 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: -10 },
  timeText: { color: '#AAAAAA', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },

  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20 },
  
  secondaryBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  secondaryIconImage: { width: 22, height: 22, tintColor: '#FFFFFF' },
  activeBtn: { opacity: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  repeatOneBadge: { position: 'absolute', right: -6, top: -6, backgroundColor: '#FFFFFF', borderRadius: 7, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  repeatOneText: { color: '#030303', fontSize: 9, fontWeight: 'bold', marginLeft: 0.5 },

  primaryBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  primaryIconImage: { width: 32, height: 32, tintColor: '#FFFFFF' },

  playPauseBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  playPauseImage: { width: 32, height: 32, tintColor: '#000000', marginLeft: 4 }, 
});
