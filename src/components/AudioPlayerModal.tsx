import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAudioPlayback } from './AudioPlaybackProvider';
import { AudioArtworkImage } from './AudioArtwork';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 48;

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${(Math.floor(seconds) % 60).toString().padStart(2, '0')}`;
};

export default function AudioPlayerModal({ visible, onClose }: AudioPlayerModalProps) {
  const { 
    activeMedia, currentTime, duration, isPlaying, 
    togglePlayback, seekTo, skipToNext, skipToPrevious,
    isShuffle, repeatMode, toggleShuffle, toggleRepeat 
  } = useAudioPlayback();
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  if (!activeMedia) return null;

  const displayTime = isSeeking ? seekTime : currentTime;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        
<View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Image 
              source={require('@/assets/images/tabIcons/arrowd.png')} 
              style={styles.headerIconImage} 
              resizeMode="contain" 
            />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Playing from your library</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.content}>
          
          <View style={styles.artworkContainer}>
            <AudioArtworkImage uri={activeMedia.uri} size={ARTWORK_SIZE} style={styles.artworkImage} />
          </View>

          <View style={styles.infoRow}>
            <View style={styles.textColumn}>
              <Text style={styles.title} numberOfLines={1}>{activeMedia.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{activeMedia.artist || 'Unknown Artist'}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton}>
              <Image 
                source={require('@/assets/images/tabIcons/like.png')} 
                style={styles.actionIconImage} 
                resizeMode="contain" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={displayTime}
              minimumTrackTintColor="#FFFFFF"
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
              <Text style={styles.timeText}>{formatDuration(duration)}</Text> 
            </View>
          </View>

          {/* Controls Row with Custom Images */}
          <View style={styles.controlsRow}>
            {/* Shuffle Button */}
            <TouchableOpacity onPress={toggleShuffle} style={[styles.secondaryBtn, isShuffle && styles.activeBtn]}>
              <Image 
                source={require('@/assets/images/tabIcons/shuffle.png')} 
                style={styles.secondaryIconImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>

           {/* Skip Back */}
            <TouchableOpacity onPress={skipToPrevious} style={styles.primaryBtn}>
              <Image 
                source={require('@/assets/images/tabIcons/next.png')} 
                style={[styles.primaryIconImage, { transform: [{ rotate: '180deg' }] }]} 
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayback} style={styles.playPauseBtn} activeOpacity={0.8}>
              <Image 
                source={isPlaying ? require('@/assets/images/tabIcons/pause.png') : require('@/assets/images/tabIcons/play.png')} 
                style={styles.playPauseImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Skip Forward */}
            <TouchableOpacity onPress={skipToNext} style={styles.primaryBtn}>
              <Image 
                source={require('@/assets/images/tabIcons/next.png')} 
                style={styles.primaryIconImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Repeat Button */}
            <TouchableOpacity onPress={toggleRepeat} style={[styles.secondaryBtn, repeatMode !== 'off' && styles.activeBtn]}>
              <View>
                <Image 
                  source={require('@/assets/images/tabIcons/repeat.png')} 
                  style={styles.secondaryIconImage} 
                  resizeMode="contain"
                />
                {/* Tiny badge for "Repeat One" state */}
                {repeatMode === 'one' && (
                  <View style={styles.repeatOneBadge}>
                    <Text style={styles.repeatOneText}>1</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
headerIconImage: { width: 28, height: 28, tintColor: '#FFFFFF' }, // <-- Added this
  headerLabel: { color: '#AAAAAA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  headerSpacer: { width: 40 }, 

  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'space-between' },
  
  artworkContainer: { width: '100%', alignItems: 'center', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  artworkImage: { width: ARTWORK_SIZE, height: ARTWORK_SIZE, borderRadius: 8 }, 

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  textColumn: { flex: 1, paddingRight: 20 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  artist: { color: '#AAAAAA', fontSize: 18, fontWeight: '500' },
  actionButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
actionIconImage: { width: 26, height: 26, tintColor: '#FFFFFF' }, // <-- Added this

  progressContainer: { marginBottom: 20 },
  slider: { width: '100%', height: 40, marginHorizontal: 0 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: -10 },
  timeText: { color: '#AAAAAA', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },

  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20 },
  
  secondaryBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  secondaryIconImage: { width: 22, height: 22, tintColor: '#FFFFFF' },
  
  // Highlight styles for active Shuffle / Repeat
  activeBtn: { opacity: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  
  // Tiny overlay for the Repeat One mode
  repeatOneBadge: { position: 'absolute', right: -6, top: -6, backgroundColor: '#FFFFFF', borderRadius: 7, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  repeatOneText: { color: '#030303', fontSize: 9, fontWeight: 'bold', marginLeft: 0.5 },

  primaryBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  primaryIconImage: { width: 32, height: 32, tintColor: '#FFFFFF' },

  playPauseBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  playPauseImage: { width: 32, height: 32, tintColor: '#000000', marginLeft: 4 }, 
});
