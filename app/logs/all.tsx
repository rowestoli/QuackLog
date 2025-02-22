// app/logs/all.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';

interface BirdLog {
  species: string;
  customSpecies?: string;
  quantity: string;
  sex?: string;
}

interface DuckDoc {
  docId: string;
  date: string; // e.g., "2023-07-22"
  blind: string;
  logs: BirdLog[];
  photos?: string[]; // optional array of photo URIs
  createdAt?: any;
}

interface DateGroup {
  date: string;
  docs: DuckDoc[];
}

export default function AllLogsScreen() {
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const router = useRouter();

  // For full-screen photo viewing:
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    // Order only by createdAt so that we don't require an index on date.
    const q = query(
      collection(db, 'duckLogs'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map: { [date: string]: DuckDoc[] } = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.date) return; // skip docs with no date
          const date: string = data.date;
          const blind: string = data.blind || '';
          const logs: BirdLog[] = Array.isArray(data.logs) ? data.logs : [];
          const photos: string[] = Array.isArray(data.photos) ? data.photos : [];
          const createdAt = data.createdAt || null;

          if (!map[date]) {
            map[date] = [];
          }
          map[date].push({
            docId: docSnap.id,
            date,
            blind,
            logs,
            photos,
            createdAt,
          });
        });

        const groupsArray: DateGroup[] = Object.keys(map).map((date) => ({
          date,
          docs: map[date],
        }));

        // Sort groups by date descending (assuming ISO format)
        groupsArray.sort((a, b) => b.date.localeCompare(a.date));
        setGroups(groupsArray);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching logs:', error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [db, auth.currentUser]);

  // Delete an entire log (Firestore document)
  const handleDeleteDoc = (docId: string) => {
    Alert.alert(
      'Delete Log?',
      'Are you sure you want to delete this log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'duckLogs', docId));
            } catch (error) {
              console.error('Error deleting log:', error);
              Alert.alert('Delete Error', 'Failed to delete log.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Open full-screen view for a photo
  const handleViewPhoto = (uri: string) => {
    setSelectedPhotoUri(uri);
    setPhotoModalVisible(true);
  };

  // Close full-screen photo modal
  const handleClosePhotoModal = () => {
    setPhotoModalVisible(false);
    setSelectedPhotoUri(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.leftContainer}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <Text style={styles.headerTitle}>All Logs</Text>
        </View>
        <View style={styles.rightContainer} />
      </View>

      {groups.length === 0 ? (
        <Text style={styles.emptyText}>No logs found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {groups.map((group) => (
            <View key={group.date} style={styles.dayCard}>
              {/* Outer block shows only the date */}
              <Text style={styles.dayTitle}>{group.date}</Text>
              {/* List each log document for that day */}
              {group.docs.map((docInfo) => (
                <View key={docInfo.docId} style={styles.docContainer}>
                  <TouchableOpacity
                    style={styles.trashButton}
                    onPress={() => handleDeleteDoc(docInfo.docId)}
                  >
                    <Image
                      source={require('../../assets/images/trashicon.png')}
                      style={styles.trashIcon}
                    />
                  </TouchableOpacity>
                  {/* For each log entry in this document */}
                  {docInfo.logs.map((entry, idx) => {
                    const qty = Number(entry.quantity || 0);
                    const isSingular = qty === 1;
                    let baseSpecies = entry.species;
                    if (entry.species === 'Other' && entry.customSpecies) {
                      baseSpecies = entry.customSpecies;
                    }
                    const speciesName = isSingular ? baseSpecies : baseSpecies + 's';
                    const sexShort =
                      entry.sex === 'Male' ? ' (M)' : entry.sex === 'Female' ? ' (F)' : '';
                    return (
                      <Text key={idx} style={styles.entryLine}>
                        • {qty} {speciesName}{sexShort} at {docInfo.blind || 'No Blind'}
                      </Text>
                    );
                  })}
                  {/* If photos exist, show previews as thumbnails */}
                  {docInfo.photos && docInfo.photos.length > 0 && (
                    <ScrollView horizontal style={styles.photosPreviewContainer} showsHorizontalScrollIndicator={false}>
                      {docInfo.photos.map((uri, index) => (
                        <TouchableOpacity key={index} onPress={() => handleViewPhoto(uri)}>
                          <Image source={{ uri }} style={styles.photoPreview} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Full-Screen Photo Modal */}
      <Modal visible={photoModalVisible} transparent={true} animationType="fade">
        <View style={styles.fullScreenModal}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={handleClosePhotoModal}>
            <Text style={styles.fullScreenCloseText}>Back</Text>
          </TouchableOpacity>
          {selectedPhotoUri && (
            <Image source={{ uri: selectedPhotoUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  leftContainer: { flexDirection: 'row', alignItems: 'center', width: 90 },
  backArrow: { fontSize: 18, color: '#007AFF', marginRight: 4 },
  backText: { fontSize: 16, color: '#007AFF' },
  centerContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  rightContainer: { width: 90 },
  scrollContent: { padding: 16 },
  emptyText: { fontSize: 18, textAlign: 'center', marginTop: 20, color: '#777' },
  // Day card: outer block per date
  dayCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  // Document container
  docContainer: {
    position: 'relative',
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  trashButton: { position: 'absolute', top: 10, right: 10, padding: 6 },
  trashIcon: { width: 20, height: 20, tintColor: '#dc3545', resizeMode: 'contain' },
  entryLine: { fontSize: 16, marginBottom: 4 },
  photosPreviewContainer: { marginTop: 8, marginBottom: 8 },
  photoPreview: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  // Full-screen modal styles
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  fullScreenCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});