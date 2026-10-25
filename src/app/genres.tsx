import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useMedia } from '../components/MediaProvider';
import { LocalMedia } from '../types';

export default function GenresRoute() {
  const { mediaFiles } = useMedia();

  const genresData = useMemo(() => {
    const groups: { [key: string]: LocalMedia[] } = {};
    mediaFiles.forEach(file => {
      const genreKey = file.genre || 'Unknown Genre';
      if (!groups[genreKey]) groups[genreKey] = [];
      groups[genreKey].push(file);
    });
    return Object.keys(groups).map(key => ({ name: key, files: groups[key] }));
  }, [mediaFiles]);

  const renderGroupItem = ({ item }: { item: { name: string; files: LocalMedia[] } }) => (
    <TouchableOpacity activeOpacity={0.85} style={styles.groupCard}>
      <View style={styles.groupIconContainer}>
        <Text style={styles.groupIcon}>🎸</Text>
      </View>
      <View style={styles.groupDetails}>
        <Text style={styles.groupTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.groupSubtitle}>{item.files.length} items</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Genres</Text>
      </View>
      <FlatList
        data={genresData}
        keyExtractor={item => item.name}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 20 },
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  groupIconContainer: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#FDE68A', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  groupIcon: { fontSize: 28 },
  groupDetails: { flex: 1 },
  groupTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  groupSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});
