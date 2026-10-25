import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAudioPlayback } from './AudioPlaybackProvider';

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${(Math.floor(seconds) % 60).toString().padStart(2, '0')}`;
};

export default function AudioPlayerModal({ visible, onClose }: AudioPlayerModalProps) {
  // Use your new provider values directly! No more intervals needed.
  const { activeMedia, currentTime, duration, isPlaying, togglePlayback, seekTo } = useAudioPlayback();
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  if (!activeMedia) return null;

  // If the user is dragging the slider, show where they are dragging. Otherwise, show actual time.
  const displayTime = isSeeking ? seekTime : currentTime;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Now Playing</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>⌄</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {/* Beautiful Placeholder Artwork */}
          <View style={styles.artworkContainer}>
            <View style={styles.artworkPlaceholder}>
              <Text style={styles.artworkIcon}>🎵</Text>
            </View>
          </View>

          {/* Track Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>{activeMedia.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{activeMedia.artist || 'Unknown Artist'}</Text>
          </View>

          {/* Premium Timeline Slider */}
          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={displayTime}
              minimumTrackTintColor="#4F46E5"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#FFFFFF"
              onSlidingStart={() => {
                setIsSeeking(true);
                setSeekTime(currentTime);
              }}
              onValueChange={(val) => setSeekTime(val)}
              onSlidingComplete={async (val) => {
                await seekTo(val);
                setIsSeeking(false);
              }}
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
              <Text style={styles.timeText}>-{formatDuration(duration - displayTime)}</Text>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              onPress={togglePlayback} 
              style={styles.playPauseBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 20, position: 'relative' },
  headerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  closeButton: { position: 'absolute', top: 12, right: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  closeIcon: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -8 },
  
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', paddingBottom: 40 },
  
  artworkContainer: { width: '100%', aspectRatio: 1, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 15 },
  artworkPlaceholder: { flex: 1, backgroundColor: '#1E293B', borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  artworkIcon: { fontSize: 80 },

  infoContainer: { alignItems: 'flex-start', marginBottom: 30 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  artist: { color: '#94A3B8', fontSize: 18, fontWeight: '500' },

  progressContainer: { marginBottom: 30 },
  slider: { width: '100%', height: 40, marginHorizontal: 0 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  timeText: { color: '#64748B', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },

  controlsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  playPauseBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  playPauseIcon: { color: '#FFF', fontSize: 36, marginLeft: 4 },
});
