import React, { createContext, useContext, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, NativeModules, ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LocalMedia } from '../types'; // Adjust path as needed

const { VideoFetcher, AudioFetcher } = NativeModules;

interface MediaContextType {
  mediaFiles: LocalMedia[];
}

const MediaContext = createContext<MediaContextType>({ mediaFiles: [] });

export const useMedia = () => useContext(MediaContext);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  const requestStoragePermission = async () => {
    try {
      let granted = false;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);
        granted = statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === 'granted' &&
                  statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO] === 'granted';
      } else {
        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        granted = status === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (granted) {
        setHasPermission(true);
        fetchLocalMedia();
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
    }
  };

  const fetchLocalMedia = async () => {
    try {
      const [videoString, audioString] = await Promise.all([
        VideoFetcher.getLocalVideos(),
        AudioFetcher.getLocalAudio()
      ]);
      setMediaFiles([...JSON.parse(videoString), ...JSON.parse(audioString)]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requestStoragePermission();
  }, []);

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
  );

  if (!hasPermission) return (
    <View style={styles.center}>
      <Text style={styles.title}>Access Required</Text>
      <TouchableOpacity style={styles.btn} onPress={requestStoragePermission}>
        <Text style={styles.btnText}>Grant Access</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <MediaContext.Provider value={{ mediaFiles }}>
      {children}
    </MediaContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  btn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 14, width: '80%' },
  btnText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' }
});
