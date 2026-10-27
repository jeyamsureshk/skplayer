import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  DeviceEventEmitter // <-- 1. Import DeviceEventEmitter
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LocalMedia } from '../types';

interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

interface AddToPlaylistModalProps {
  visible: boolean;
  mediaItem: LocalMedia | null;
  onClose: () => void;
}

export default function AddToPlaylistModal({ visible, mediaItem, onClose }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (visible) {
      loadPlaylists();
      setIsCreating(false);
      setNewPlaylistName('');
    }
  }, [visible]);

  const loadPlaylists = async () => {
    try {
      const saved = await AsyncStorage.getItem('@custom_playlists');
      if (saved) {
        setPlaylists(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleCreateSubmit = async () => {
    const trimmedName = newPlaylistName.trim();
    if (!trimmedName) {
      setIsCreating(false);
      Keyboard.dismiss();
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: trimmedName,
      trackIds: [] 
    };
    
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    
    try {
      await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updated));
      
      // 2. Broadcast that a playlist was created!
      DeviceEventEmitter.emit('PLAYLIST_UPDATED');
      
      if (mediaItem) {
        addToPlaylist(newPlaylist, updated);
      } else {
        setIsCreating(false);
        setNewPlaylistName('');
        Keyboard.dismiss();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create playlist.");
    }
  };

  const addToPlaylist = async (selectedPlaylist: Playlist, currentPlaylists = playlists) => {
    if (!mediaItem) return;

    if (selectedPlaylist.trackIds.includes(mediaItem.id)) {
      Alert.alert("Already Added", `This song is already in ${selectedPlaylist.name}.`);
      onClose();
      return;
    }

    const updatedPlaylists = currentPlaylists.map(pl => {
      if (pl.id === selectedPlaylist.id) {
        return { ...pl, trackIds: [...pl.trackIds, mediaItem.id] };
      }
      return pl;
    });

    try {
      await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updatedPlaylists));
      setPlaylists(updatedPlaylists);
      
      // 3. Broadcast that a song was added to a playlist!
      DeviceEventEmitter.emit('PLAYLIST_UPDATED');
      
      Alert.alert("Success", `Added to ${selectedPlaylist.name}`);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save to playlist.");
    }
  };

  // Close modal or dismiss keyboard when tapping the background
  const handleBackdropPress = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      setIsCreating(false);
    } else {
      onClose();
    }
  };

  if (!mediaItem) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={50} tint="dark" style={styles.overlay}>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheet}>
            <LinearGradient colors={['#18181B', '#09090B']} style={styles.sheetContent}>
              
              <View style={styles.dragHandle} />
              
              <View style={styles.header}>
                <Text style={styles.title}>Add to Playlist</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                  <Ionicons name="close-circle" size={28} color="#71717A" />
                </TouchableOpacity>
              </View>

              {isCreating ? (
                <View style={styles.createInputRow}>
                  <TextInput
                    style={styles.createInput}
                    placeholder="Name your playlist..."
                    placeholderTextColor="#71717A"
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    autoFocus
                    onSubmitEditing={handleCreateSubmit}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.createRow} onPress={() => setIsCreating(true)} activeOpacity={0.7}>
                  <View style={styles.createIconBg}>
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.createText}>New Playlist</Text>
                </TouchableOpacity>
              )}

              <FlatList
                data={playlists}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.playlistRow} onPress={() => addToPlaylist(item)} activeOpacity={0.7}>
                    <View style={styles.listIconBg}>
                      <Ionicons name="musical-notes" size={20} color="#A5B4FC" />
                    </View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.playlistName}>{item.name}</Text>
                      <Text style={styles.playlistCount}>{item.trackIds.length} songs</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#71717A" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="albums-outline" size={48} color="#3F3F46" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>You haven't created any playlists yet.</Text>
                  </View>
                }
              />

            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  backdrop: { flex: 1 }, 
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: '85%' },
  sheetContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#3F3F46', alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  closeBtn: { padding: 4 },
  createRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#27272A', marginBottom: 16 },
  createIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  createText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  createInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  createInput: { flex: 1, backgroundColor: '#27272A', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 16, borderWidth: 1, borderColor: '#4F46E5', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10 },
  saveBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  playlistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingHorizontal: 12 },
  listIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  listTextContainer: { flex: 1 },
  playlistName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.2 },
  playlistCount: { fontSize: 13, color: '#A1A1AA', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyText: { color: '#71717A', textAlign: 'center', fontSize: 15, fontWeight: '500' }
});
