import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useAudioPlayback } from './AudioPlaybackProvider';
import AudioPlayerModal from './AudioPlayerModal';

// Import the native artwork component
import { AudioArtworkImage } from './AudioArtwork';

export default function MiniPlayer() {
  // Extract functions from the provider
  const { 
    activeMedia, 
    isPlaying, 
    togglePlayback, 
    skipToNext, 
    skipToPrevious 
  } = useAudioPlayback();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!activeMedia) return null;

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.card}
          onPress={() => setIsModalOpen(true)}
        >
          {/* FIX: Added key={activeMedia.id} to force dynamic artwork updates! */}
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

          {/* Action Controls */}
          <View style={styles.controls}>
            {/* Previous Button */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={skipToPrevious}
              activeOpacity={0.7}
            >
              <Image 
                source={require('@/assets/images/tabIcons/next.png')} 
                style={[styles.iconImage, { transform: [{ rotate: '180deg' }] }]} 
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Play/Pause Button */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={togglePlayback}
              activeOpacity={0.7}
            >
              <Image 
                source={isPlaying ? require('@/assets/images/tabIcons/pause.png') : require('@/assets/images/tabIcons/play.png')} 
                style={styles.iconImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={skipToNext}
              activeOpacity={0.7}
            >
              <Image 
                source={require('@/assets/images/tabIcons/next.png')} 
                style={styles.iconImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

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
    paddingRight: 10,
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
    marginRight: 10,
  },
  info: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingRight: 4 
  },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  artist: { 
    color: '#94A3B8', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: { 
    width: 20, 
    height: 20, 
    tintColor: '#FFFFFF' 
  },
});
