import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getDefaultGitHubAccount } from '../src/store/useStore';
import { useRouter } from 'expo-router';

export default function GitHub() {
  const router = useRouter();
  const { pendingFiles, setPendingFiles, linkedRepo, setLinkedRepo } = useStore();
  const [repoName, setRepoName] = useState('');
  const [pushing, setPushing] = useState(false);
  
  const ghAccount = getDefaultGitHubAccount();
  const hasFiles = pendingFiles && Object.keys(pendingFiles).length > 0;

  const createAndPush = async () => {
    if (!ghAccount) {
      Alert.alert('No GitHub Account', 'Add a GitHub account in Settings');
      router.push('/settings');
      return;
    }
    if (!repoName.trim()) {
      Alert.alert('Error', 'Enter repository name');
      return;
    }
    if (!hasFiles) {
      Alert.alert('No Files', 'Generate code first using AI chat');
      return;
    }

    setPushing(true);
    try {
      // Create repo
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghAccount.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: repoName.trim(), private: false, auto_init: true }),
      });
      
      if (!createRes.ok && createRes.status !== 422) {
        throw new Error('Failed to create repository');
      }

      const repoFullName = `${ghAccount.username}/${repoName.trim()}`;
      
      // Wait for repo init
      await new Promise(r => setTimeout(r, 2000));

      // Push files one by one
      for (const [path, content] of Object.entries(pendingFiles!)) {
        await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${ghAccount.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add ${path}`,
            content: btoa(unescape(encodeURIComponent(content))),
          }),
        });
      }

      setLinkedRepo(repoFullName);
      setPendingFiles(null);
      Alert.alert('Success!', `Code pushed to ${repoFullName}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* GitHub Account Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GitHub Account</Text>
        {ghAccount ? (
          <View style={styles.accountBox}>
            <Ionicons name="logo-github" size={24} color="#FFF" />
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>@{ghAccount.username}</Text>
              <Text style={styles.accountStatus}>Connected</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        ) : (
          <TouchableOpacity style={styles.addAccount} onPress={() => router.push('/settings')}>
            <Text style={styles.addAccountText}>Add GitHub Account</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Files */}
      {hasFiles && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Files ({Object.keys(pendingFiles!).length})</Text>
          {Object.keys(pendingFiles!).map((file, i) => (
            <View key={i} style={styles.fileItem}>
              <Ionicons name="document-text" size={16} color="#A78BFA" />
              <Text style={styles.fileName}>{file}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Create & Push */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push to GitHub</Text>
        <TextInput
          style={styles.input}
          placeholder="Repository name (e.g., my-app)"
          placeholderTextColor="#6B7280"
          value={repoName}
          onChangeText={setRepoName}
        />
        <TouchableOpacity 
          style={[styles.pushBtn, (!hasFiles || pushing) && styles.pushBtnDisabled]} 
          onPress={createAndPush}
          disabled={!hasFiles || pushing}
        >
          {pushing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="rocket" size={20} color="#000" />
              <Text style={styles.pushBtnText}>Create Repo & Push</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Linked Repo */}
      {linkedRepo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Repository</Text>
          <View style={styles.linkedBox}>
            <Ionicons name="git-branch" size={20} color="#10B981" />
            <Text style={styles.linkedText}>{linkedRepo}</Text>
          </View>
          <Text style={styles.hint}>GitHub Actions will auto-build APK/AAB on push</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  section: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F2E' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  accountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, gap: 12 },
  accountInfo: { flex: 1 },
  accountName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  accountStatus: { color: '#10B981', fontSize: 12 },
  addAccount: { backgroundColor: '#A78BFA', padding: 14, borderRadius: 10, alignItems: 'center' },
  addAccountText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  fileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  fileName: { color: '#D1D5DB', fontSize: 13, flex: 1 },
  input: { backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2D2D3D', borderRadius: 10, color: '#FFF', padding: 14, fontSize: 15, marginBottom: 12 },
  pushBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#A78BFA', padding: 14, borderRadius: 10, gap: 8 },
  pushBtnDisabled: { opacity: 0.5 },
  pushBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  linkedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', padding: 12, borderRadius: 10, gap: 10 },
  linkedText: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  hint: { color: '#6B7280', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
