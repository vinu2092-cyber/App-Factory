/**
 * VOICE INPUT SERVICE - Speech to Text via Recording
 * 
 * Features:
 * 1. Record audio from microphone
 * 2. Send to Gemini for transcription
 * 3. Support Hindi & English
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface VoiceRecordingResult {
  uri: string;
  base64: string;
  duration: number;
}

class VoiceInputService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  // Request microphone permission
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for voice input.');
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Start recording
  async startRecording(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return false;

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      return true;
    } catch (e: any) {
      console.error('Failed to start recording:', e);
      Alert.alert('Error', 'Recording start nahi ho paya: ' + e.message);
      return false;
    }
  }

  // Stop recording and get result
  async stopRecording(): Promise<VoiceRecordingResult | null> {
    if (!this.recording) return null;

    try {
      this.isRecording = false;
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      if (!uri) return null;

      // Get recording status for duration
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      this.recording = null;

      return {
        uri,
        base64,
        duration: Math.round(duration / 1000), // seconds
      };
    } catch (e: any) {
      console.error('Failed to stop recording:', e);
      this.recording = null;
      return null;
    }
  }

  // Cancel recording
  async cancelRecording(): Promise<void> {
    if (!this.recording) return;

    try {
      this.isRecording = false;
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    } catch (e) {
      this.recording = null;
    }
  }

  // Check if currently recording
  getIsRecording(): boolean {
    return this.isRecording;
  }
}

// Singleton instance
export const voiceInputService = new VoiceInputService();
export default voiceInputService;
