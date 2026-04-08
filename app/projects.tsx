import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Projects() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="folder-open" size={40} color="#A78BFA" />
        </View>
        <Text style={styles.emptyTitle}>No Projects Yet</Text>
        <Text style={styles.emptyText}>Start a conversation with AI to create your first app project.</Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/')}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.startBtnText}>Create New App</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22, marginBottom: 24 },
  startBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#A78BFA', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  startBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
});
