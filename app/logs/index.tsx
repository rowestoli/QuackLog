// app/logs/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DropDownPicker from 'react-native-dropdown-picker';
import CustomHeader from '../../components/CustomHeader';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';

interface BirdLog {
  species: string;
  customSpecies?: string;
  quantity: string;
  sex?: string;
}

interface RecentLogDisplay {
  id: string;
  date: string;
  numBirds: number;
  blind: string;
}

interface DuckLog {
  id: string;
  date: string;
  logs: BirdLog[];
  blind: string;
  createdAt?: any;
}

const SPECIES_ITEMS = [
  { label: 'Widgeon', value: 'Widgeon' },
  { label: 'Spoon', value: 'Spoon' },
  { label: 'Teal', value: 'Teal' },
  { label: 'Sprig', value: 'Sprig' },
  { label: 'Mallard', value: 'Mallard' },
  { label: 'Goose', value: 'Goose' },
  { label: 'Other', value: 'Other' },
];

const SEX_ITEMS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
];

export default function LogsScreen() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [birdLogs, setBirdLogs] = useState<BirdLog[]>([{ species: '', quantity: '', sex: '' }]);
  const [blind, setBlind] = useState('');
  const [openSpecies, setOpenSpecies] = useState<boolean[]>([false]);
  const [openSex, setOpenSex] = useState<boolean[]>([false]);
  const [saving, setSaving] = useState(false);
  // Photos state: only for initial logging
  const [photos, setPhotos] = useState<string[]>([]);

  const db = getFirestore();
  const router = useRouter();

  const [recentLogs, setRecentLogs] = useState<RecentLogDisplay[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [prevLogs, setPrevLogs] = useState<DuckLog[]>([]);
  const [loadingPrevLogs, setLoadingPrevLogs] = useState(true);

  //================= 1) FETCH RECENT LOGS (INDEX FEED) =================
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'duckLogs'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groupsMap: { [date: string]: { logs: BirdLog[]; blinds: Set<string> } } = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.date) return;
          const date: string = data.date;
          const logs: BirdLog[] = Array.isArray(data.logs) ? data.logs : [];
          const docBlind: string = data.blind || '';
          if (groupsMap[date]) {
            groupsMap[date].logs.push(...logs);
            if (docBlind) groupsMap[date].blinds.add(docBlind);
          } else {
            groupsMap[date] = { date, logs: [...logs], blinds: docBlind ? new Set([docBlind]) : new Set() };
          }
        });
        const groupsArray: RecentLogDisplay[] = Object.values(groupsMap).map((group) => {
          const totalBirds = group.logs.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
          const blindDisplay =
            group.blinds.size === 1
              ? Array.from(group.blinds)[0]
              : Array.from(group.blinds).join(', ');
          return { id: group.date, date: group.date, numBirds: totalBirds, blind: blindDisplay };
        });
        groupsArray.sort((a, b) => b.date.localeCompare(a.date));
        setRecentLogs(groupsArray);
        setLoadingRecent(false);
      },
      (error) => {
        console.error('Error fetching recent logs:', error);
        setLoadingRecent(false);
      }
    );
    return unsubscribe;
  }, [db, auth.currentUser]);

  //================= 2) FETCH PREVIOUS LOGS FOR SELECTED DAY =================
  const fetchPrevLogsForDate = async (date: string) => {
    if (!auth.currentUser) return;
    setLoadingPrevLogs(true);
    const q = query(
      collection(db, 'duckLogs'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '==', date)
    );
    try {
      const snapshot = await getDocs(q);
      const logs: DuckLog[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date || '',
          logs: Array.isArray(data.logs) ? data.logs : [],
          blind: data.blind || '',
          createdAt: data.createdAt,
        };
      });
      logs.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });
      setPrevLogs(logs);
    } catch (error) {
      console.error('Error fetching previous logs for date:', error);
    } finally {
      setLoadingPrevLogs(false);
    }
  };

  //================= 3) ON DAY PRESS: OPEN MODAL, RESET FORM & PHOTOS, FETCH PREV LOGS ============
  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setBirdLogs([{ species: '', quantity: '', sex: '' }]);
    setBlind('');
    setOpenSpecies([false]);
    setOpenSex([false]);
    setPhotos([]); // reset photos when starting a new log
    setModalVisible(true);
    fetchPrevLogsForDate(day.dateString);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  //================= 4) ADD A NEW ROW FOR LOG ENTRY =================
  const handleAddMore = () => {
    setBirdLogs([...birdLogs, { species: '', quantity: '', sex: '' }]);
    setOpenSpecies([...openSpecies, false]);
    setOpenSex([...openSex, false]);
  };

  //================= 5) HANDLE CHANGES PER ROW =================
  const handleBirdLogChange = (index: number, field: keyof BirdLog, value: string) => {
    const updated = [...birdLogs];
    updated[index][field] = value;
    if (field === 'species' && value !== 'Other') {
      updated[index].customSpecies = '';
    }
    setBirdLogs(updated);
  };

  //================= 6) SAVE LOGS WITH ERROR CHECKING =================
  const handleSaveLogs = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Error', 'No date selected.');
      return;
    }
    const validLogs: BirdLog[] = [];
    for (let log of birdLogs) {
      const trimmedSpecies = log.species.trim();
      const trimmedQty = log.quantity.trim();
      if (!trimmedSpecies && !trimmedQty) continue;
      if (!trimmedSpecies) {
        Alert.alert('Incomplete Data', 'Please enter species.');
        return;
      }
      if (!trimmedQty || isNaN(Number(trimmedQty)) || Number(trimmedQty) <= 0) {
        Alert.alert('Incomplete Data', 'Please enter quantity.');
        return;
      }
      validLogs.push({
        species: trimmedSpecies,
        quantity: trimmedQty,
        sex: log.sex || '',
        customSpecies: log.customSpecies ? log.customSpecies.trim() : '',
      });
    }
    if (validLogs.length === 0) {
      Alert.alert('Nothing to save', 'No valid duck entries found.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'duckLogs'), {
        userId: auth.currentUser.uid,
        date: selectedDate,
        logs: validLogs,
        blind: blind.trim(),
        photos: photos, // only for new log entries
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
    } catch (error: any) {
      console.error('Error saving log:', error);
      Alert.alert('Error', 'Failed to save log.');
    } finally {
      setSaving(false);
    }
  };

  //================= 7) HANDLE ADD PHOTOS FROM CAMERA ROLL =================
  const handleAddPhotos = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Permission to access camera roll is required!');
        return;
      }
      // Use a fallback for mediaTypes in case ImagePicker.MediaType is undefined
      const mediaTypeOption = ImagePicker.MediaType ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypeOption,
        allowsEditing: true,
        quality: 1,
      });
      console.log('ImagePicker result:', result);
      if (result.canceled) {
        return;
      }
      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (uri) {
          setPhotos((prev) => [...prev, uri]);
        }
      } else if ((result as any).uri) {
        setPhotos((prev) => [...prev, (result as any).uri]);
      }
    } catch (error) {
      console.error('Error in handleAddPhotos:', error);
      Alert.alert('Error', 'Failed to add photo.');
    }
  };

  //================= 8) RENDER A SINGLE BIRD LOG ROW =================
  const renderBirdLogRow = (log: BirdLog, index: number) => (
    <View key={index} style={styles.birdLogContainer}>
      <View style={styles.dropdownRow}>
        <View style={styles.dropdownWrapper}>
          <DropDownPicker
            open={openSpecies[index]}
            value={log.species}
            items={SPECIES_ITEMS}
            setOpen={(val) => {
              const newOpenSpecies = [...openSpecies].map((o, i) =>
                i === index ? val : false
              );
              setOpenSpecies(newOpenSpecies);
              setOpenSex([...openSex].map(() => false));
            }}
            setValue={(callback) => {
              const val = callback(log.species);
              if (typeof val === 'string') {
                handleBirdLogChange(index, 'species', val);
              }
            }}
            setItems={() => {}}
            placeholder="Species"
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            zIndex={1000 - index}
            textStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>
        <View style={styles.dropdownWrapper}>
          <DropDownPicker
            open={openSex[index]}
            value={log.sex}
            items={SEX_ITEMS}
            setOpen={(val) => {
              const newOpenSex = [...openSex].map((o, i) =>
                i === index ? val : false
              );
              setOpenSex(newOpenSex);
              setOpenSpecies([...openSpecies].map(() => false));
            }}
            setValue={(callback) => {
              const val = callback(log.sex);
              if (typeof val === 'string') {
                handleBirdLogChange(index, 'sex', val);
              }
            }}
            setItems={() => {}}
            placeholder="Sex (optional)"
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            zIndex={500 - index}
            textStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>
        <TextInput
          style={[styles.input, styles.qtyInput]}
          placeholder="Qty"
          keyboardType="numeric"
          value={log.quantity}
          onChangeText={(txt) => handleBirdLogChange(index, 'quantity', txt)}
        />
      </View>
      {log.species === 'Other' && (
        <TextInput
          style={[styles.input, styles.customSpeciesInput]}
          placeholder="Custom species"
          value={log.customSpecies}
          onChangeText={(txt) => handleBirdLogChange(index, 'customSpecies', txt)}
        />
      )}
    </View>
  );

  //================= RENDER COMPONENT =================
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Logs</Text>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={
            selectedDate
              ? { [selectedDate]: { selected: true, selectedColor: '#2c3e50' } }
              : {}
          }
        />

        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Recent Logs:</Text>
          <TouchableOpacity onPress={() => router.push('/logs/all')}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        {loadingRecent ? (
          <ActivityIndicator size="large" color="#2c3e50" style={styles.feedLoading} />
        ) : (
          <ScrollView style={styles.feedContainer} showsVerticalScrollIndicator={false}>
            {recentLogs.length === 0 ? (
              <Text style={styles.feedEmptyText}>No logs yet.</Text>
            ) : (
              recentLogs.map((log) => (
                <View key={log.id} style={styles.feedItem}>
                  <Text style={styles.feedItemDate}>{log.date}</Text>
                  <Text style={styles.feedItemCount}>
                    {log.numBirds} {log.numBirds === 1 ? 'bird' : 'birds'} at {log.blind}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        <Modal visible={modalVisible} animationType="slide" onRequestClose={handleCancel}>
          <CustomHeader />
          <TouchableWithoutFeedback
            onPress={() => {
              setOpenSpecies(openSpecies.map(() => false));
              setOpenSex(openSex.map(() => false));
            }}
          >
            <View style={styles.modalWrapper}>
              <View style={styles.modalContainer}>
                <Text style={styles.dateTitle}>{selectedDate}</Text>
                <View style={styles.dropdownSection}>
                  {birdLogs.map((log, i) => renderBirdLogRow(log, i))}
                  <TouchableOpacity onPress={handleAddMore} style={styles.addMoreButton}>
                    <Text style={styles.addMoreText}>+ Add more</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.input, styles.blindInput]}
                    placeholder="Which blind?"
                    value={blind}
                    onChangeText={setBlind}
                  />

                  {/* Add Photos Button (only for new log entries) */}
                  <TouchableOpacity onPress={handleAddPhotos} style={styles.addPhotosButton}>
                    <Text style={styles.addPhotosText}>Add Photos</Text>
                  </TouchableOpacity>

                  {/* Photo Previews */}
                  {photos.length > 0 && (
                    <ScrollView horizontal style={styles.photosPreviewContainer} showsHorizontalScrollIndicator={false}>
                      {photos.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={styles.photoPreview} />
                      ))}
                    </ScrollView>
                  )}
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={handleCancel} style={[styles.actionButton, { marginRight: 20 }]}>
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveLogs} style={styles.actionButton}>
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, marginBottom: 12, fontWeight: 'bold', alignSelf: 'center' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingHorizontal: 16 },
  feedTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAllButton: { fontSize: 18, color: '#007AFF' },
  feedLoading: { marginTop: 20 },
  feedContainer: { marginTop: 10, paddingHorizontal: 16, height: 150 },
  feedEmptyText: { fontSize: 20, color: '#777', textAlign: 'center' },
  feedItem: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  feedItemDate: { fontSize: 18, color: '#333', fontWeight: 'bold' },
  feedItemCount: { fontSize: 18, color: '#333' },
  modalWrapper: { flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 15 },
  dateTitle: { fontSize: 20, fontWeight: 'bold', alignSelf: 'center', marginTop: 15 },
  dropdownSection: { marginTop: 15, paddingHorizontal: 16 },
  birdLogContainer: { marginBottom: 12 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center' },
  dropdownWrapper: { flex: 1, marginRight: 8 },
  dropdown: { borderColor: '#ccc', borderWidth: 1, height: 40 },
  dropdownContainer: { width: '100%' },
  dropdownText: { fontSize: 14, color: '#999' },
  dropdownPlaceholder: { fontSize: 14, color: '#bbb' },
  input: { borderColor: '#ccc', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 5, marginRight: 8, marginBottom: 8, height: 40 },
  qtyInput: { width: 60, textAlignVertical: 'center' },
  customSpeciesInput: { marginTop: 8, height: 40 },
  addMoreButton: { marginBottom: 12 },
  addMoreText: { color: '#007AFF', fontWeight: '600' },
  blindInput: { marginBottom: 20, height: 40 },
  addPhotosButton: { backgroundColor: '#2c3e50', padding: 10, borderRadius: 5, alignItems: 'center', marginBottom: 10 },
  addPhotosText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  photosPreviewContainer: { marginBottom: 10 },
  photoPreview: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
  buttonRow: { position: 'absolute', top: '75%', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  actionButton: { backgroundColor: '#2c3e50', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16 },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});