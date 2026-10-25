import React, { useEffect, useState, memo } from 'react';
import { View, Image, StyleSheet, NativeModules, Text } from 'react-native';

const { AudioArtwork } = NativeModules;

// In-memory cache to prevent flashing on re-renders
const artworkCache = new Map<string, string | null>();

interface AudioArtworkProps {
  uri: string;
  size?: number;
  style?: any;
}

export const AudioArtworkImage = memo(({ uri, size = 56, style }: AudioArtworkProps) => {
  const [imageUri, setImageUri] = useState<string | null>(artworkCache.get(uri) || null);

  useEffect(() => {
    if (artworkCache.has(uri)) return;

    let isMounted = true;
    
    AudioArtwork.getArtwork(uri)
      .then((path: string | null) => {
        if (isMounted && path) {
          artworkCache.set(uri, path);
          setImageUri(path);
        } else if (isMounted) {
          artworkCache.set(uri, null); // Cache the negative result so we don't try again
        }
      })
      .catch(() => {
        if (isMounted) artworkCache.set(uri, null);
      });

    return () => { isMounted = false; };
  }, [uri]);

  if (imageUri) {
    return (
      <Image 
        source={{ uri: imageUri }} 
        style={[{ width: size, height: size, borderRadius: size * 0.09 }, style]} 
        resizeMode="cover" 
      />
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.2 }, styles.placeholder, style]}>
      <Text style={{ fontSize: size * 0.5 }}>💽</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
