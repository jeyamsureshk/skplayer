import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAudioPlayback } from './AudioPlaybackProvider';

// 1. Import your Modal here instead
import AudioPlayerModal from './AudioPlayerModal';

export default function MiniPlayer() {
  const { activeMedia, isPlaying, togglePlayback } = useAudioPlayback();
  
  // 2. Control the full-screen modal directly from the Mini-Player
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If nothing is playing, don't show the player
  if (!activeMedia) return null;

  return (
    <>
      <View style={styles.container}>
        {/* 3. Make the main card tappable to open the modal */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.card}
          onPress={() => setIsModalOpen(true)}
        >
          <View style={styles.artwork}>
            <Text style={styles.artworkIcon}>{isPlaying ? '🎶' : '🎵'}</Text>
          </View>
          
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{activeMedia.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{activeMedia.artist || 'Unknown Artist'}</Text>
          </View>

          {/* 4. Keep the play/pause button independent */}
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={togglePlayback}
            activeOpacity={0.7}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* 5. Render the global modal here */}
      <AudioPlayerModal 
        visible={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 85, 
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 8,
    paddingRight: 16,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artworkIcon: { fontSize: 20 },
  info: { flex: 1, justifyContent: 'center' },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  artist: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  playButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { color: '#FFF', fontSize: 26, marginLeft: 2 },
});
