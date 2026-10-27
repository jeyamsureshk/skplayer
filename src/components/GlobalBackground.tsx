import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayback } from './AudioPlaybackProvider';
import { AudioArtworkImage } from './AudioArtwork';

const { width, height } = Dimensions.get('window');

export default function GlobalBackground() {
  const { activeMedia } = useAudioPlayback();

  return (
    // FIX: Removed zIndex and elevation
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {activeMedia ? (
        <>
          <AudioArtworkImage 
            uri={activeMedia.uri} 
            size={Math.max(width, height)} 
            style={StyleSheet.absoluteFillObject} 
          />
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient 
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']} 
            style={StyleSheet.absoluteFillObject} 
          />
        </>
      ) : (
        <LinearGradient colors={['#1E1E1E', '#000000']} style={StyleSheet.absoluteFillObject} />
      )}
    </View>
  );
}
