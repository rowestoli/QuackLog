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
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DropDownPicker from 'react-native-dropdown-picker';
import CustomHeader from '../../components/CustomHeader';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';

interface BirdLog {
  species: string;
  customSpecies?: string;
  quantity: string;
  sex: string;
}

interface RecentLog {
  id: string;
  date: string;
  numBirds: number;
  blind: string;
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
  const [birdLogs, setBirdLogs] = useState<BirdLog[]>([
    { species: '', quantity: '', sex: '', customSpecies: '' },
  ]);
  const [blind, setBlind] = useState('');
  const [openSpecies, setOpenSpecies] = useState<boolean[]>([false]);
  const [openSex, setOpenSex] = useState<boolean[]>([false]);
  const [saving, setSaving] = useState(false);

  // Recent logs feed state
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const db = getFirestore();
  const router = useRouter();

  // Listen for recent logs from Firestore for the current user
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "duckLogs"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: RecentLog[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const numBirds = Array.isArray(data.logs)
          ? data.logs.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0)
          : 0;
        return {
          id: doc.id,
          date: data.date,
          numBirds,
          blind: data.blind || "",
        };
      });
      setRecentLogs(logs);
      setLoadingRecent(false);
    }, (error) => {
      console.error("Error fetching recent logs:", error);
      setLoadingRecent(false);
    });
    return unsubscribe;
  }, [db, auth.currentUser]);

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setBirdLogs([{ species: '', quantity: '', sex: '', customSpecies: '' }]);
    setBlind('');
    setOpenSpecies([false]);
    setOpenSex([false]);
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleAddMore = () => {
    setBirdLogs([...birdLogs, { species: '', quantity: '', sex: '', customSpecies: '' }]);
    setOpenSpecies([...openSpecies, false]);
    setOpenSex([...openSex, false]);
  };

  const handleBirdLogChange = (index: number, field: keyof BirdLog, value: string) => {
    const updated = [...birdLogs];
    updated[index][field] = value;
    if (field === 'species' && value !== 'Other') {
      updated[index].customSpecies = '';
    }
    setBirdLogs(updated);
  };

  const handleSaveLogs = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "duckLogs"), {
        userId: auth.currentUser.uid,
        date: selectedDate,
        logs: birdLogs,
        blind: blind,
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
    } catch (error: any) {
      console.error("Error saving log:", error);
      Alert.alert("Error", "Failed to save log.");
    } finally {
      setSaving(false);
    }
  };

  const renderBirdLogRow = (log: BirdLog, index: number) => {
    return (
      <View key={index} style={styles.birdLogContainer}>
        <View style={styles.dropdownRow}>
          {/* Species Dropdown */}
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
                const value = callback(log.species);
                if (typeof value === 'string') {
                  handleBirdLogChange(index, 'species', value);
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
          {/* Sex Dropdown */}
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
                const value = callback(log.sex);
                if (typeof value === 'string') {
                  handleBirdLogChange(index, 'sex', value);
                }
              }}
              setItems={() => {}}
              placeholder="Sex"
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              zIndex={500 - index}
              textStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
            />
          </View>
          {/* Quantity Input */}
          <TextInput
            style={[styles.input, styles.qtyInput]}
            placeholder="Qty"
            keyboardType="numeric"
            value={log.quantity}
            onChangeText={(text) => handleBirdLogChange(index, 'quantity', text)}
          />
        </View>
        {log.species === 'Other' && (
          <TextInput
            style={[styles.input, styles.customSpeciesInput]}
            placeholder="Custom species"
            value={log.customSpecies}
            onChangeText={(text) => handleBirdLogChange(index, 'customSpecies', text)}
          />
        )}
      </View>
    );
  };

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

        {/* Recent Logs Feed Header */}
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Recent Logs:</Text>
          <TouchableOpacity onPress={() => router.push('/logs/all')}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        {/* Recent Logs Feed */}
        {loadingRecent ? (
          <ActivityIndicator size="small" color="#2c3e50" style={styles.feedLoading} />
        ) : (
          <View style={styles.feedContainer}>
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
          </View>
        )}

        <Modal visible={modalVisible} animationType="slide" onRequestClose={handleCancel}>
          {/* Custom header inside the modal */}
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
                  {birdLogs.map((log, index) => renderBirdLogRow(log, index))}
                  <TouchableOpacity onPress={handleAddMore} style={styles.addMoreButton}>
                    <Text style={styles.addMoreText}>+ Add more</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.blindInput]}
                    placeholder="Which blind?"
                    value={blind}
                    onChangeText={setBlind}
                  />
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
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: 'bold', alignSelf: 'center' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingHorizontal: 16 },
  feedTitle: { fontSize: 18, fontWeight: 'bold' },
  seeAllButton: { fontSize: 16, color: '#007AFF' },
  feedLoading: { marginTop: 10 },
  feedContainer: { marginTop: 10, paddingHorizontal: 16 },
  feedEmptyText: { fontSize: 16, color: '#777', textAlign: 'center' },
  feedItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  feedItemDate: { fontSize: 16, color: '#333' },
  feedItemCount: { fontSize: 16, color: '#333' },
  modalWrapper: { flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 15 },
  dateTitle: { fontSize: 18, fontWeight: 'bold', alignSelf: 'center', marginTop: 15 },
  dropdownSection: { marginTop: 15, paddingHorizontal: 16 },
  birdLogContainer: { marginBottom: 12 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center' },
  dropdownWrapper: { flex: 1, marginRight: 8 },
  dropdown: { borderColor: '#ccc', borderWidth: 1, height: 40 },
  dropdownContainer: { width: '100%' },
  dropdownText: { fontSize: 14, color: '#999' },
  dropdownPlaceholder: { fontSize: 14, color: '#bbb' },
  input: { borderColor: '#ccc', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 5, marginRight: 8, marginBottom: 8, height: 40 },
  qtyInput: { width: 60, paddingVertical: 0, textAlignVertical: 'center' },
  customSpeciesInput: { marginTop: 8, height: 40 },
  addMoreButton: { marginBottom: 12 },
  addMoreText: { color: '#007AFF', fontWeight: '600' },
  blindInput: { marginBottom: 20, height: 40 },
  buttonRow: { position: 'absolute', top: '75%', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  actionButton: { backgroundColor: '#2c3e50', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16 },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});
