/**
 * MEDIA SERVICE - Import, Export, Analysis
 * 
 * Features:
 * 1. Import from Gallery (Photo, Video)
 * 2. Import from Files (Audio, Documents)
 * 3. Export Project to Storage
 * 4. APK Download from GitHub
 * 5. Media Analysis for AI Debugging
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

// ===========================================
// TYPES
// ===========================================

export interface MediaFile {
  uri: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  mimeType?: string;
  size?: number;
  base64?: string;
}

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface APKDownloadResult {
  success: boolean;
  path?: string;
  error?: string;
}

// ===========================================
// PERMISSION HELPERS
// ===========================================

export const requestMediaPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Media library access is needed to import files.');
    return false;
  }
  return true;
};

export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Camera access is needed.');
    return false;
  }
  return true;
};

// ===========================================
// IMPORT FROM GALLERY
// ===========================================

export const pickImage = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestMediaPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: 'image',
    name: asset.fileName || `image_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
    base64: asset.base64,
  };
};

export const pickVideo = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestMediaPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality: 0.8,
    videoMaxDuration: 60, // Max 60 seconds for analysis
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  
  // Read video as base64 for smaller files (under 10MB)
  let base64: string | undefined;
  if (asset.fileSize && asset.fileSize < 10 * 1024 * 1024) {
    try {
      base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Skip base64 for larger files
    }
  }

  return {
    uri: asset.uri,
    type: 'video',
    name: asset.fileName || `video_${Date.now()}.mp4`,
    mimeType: asset.mimeType || 'video/mp4',
    size: asset.fileSize,
    base64,
  };
};

export const takePhoto = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: 'image',
    name: `photo_${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
    base64: asset.base64,
  };
};

export const recordVideo = async (): Promise<MediaFile | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality: 0.8,
    videoMaxDuration: 30,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: 'video',
    name: `recording_${Date.now()}.mp4`,
    mimeType: 'video/mp4',
    size: asset.fileSize,
  };
};

// ===========================================
// IMPORT FROM FILES (Audio, Documents)
// ===========================================

export const pickAudio = async (): Promise<MediaFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    
    // Read as base64 for smaller files
    let base64: string | undefined;
    if (asset.size && asset.size < 5 * 1024 * 1024) {
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {}
    }

    return {
      uri: asset.uri,
      type: 'audio',
      name: asset.name,
      mimeType: asset.mimeType || 'audio/mpeg',
      size: asset.size,
      base64,
    };
  } catch (e) {
    return null;
  }
};

export const pickDocument = async (): Promise<MediaFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: 'document',
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };
  } catch (e) {
    return null;
  }
};

// ===========================================
// EXPORT PROJECT TO STORAGE
// ===========================================

export const exportProjectToStorage = async (
  projectName: string,
  files: Record<string, string>
): Promise<ExportResult> => {
  try {
    // Create export directory
    const exportDir = `${FileSystem.documentDirectory}exports/${projectName}`;
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });

    // Write all files
    for (const [path, content] of Object.entries(files)) {
      const filePath = `${exportDir}/${path}`;
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      
      // Create directory structure
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      
      // Write file
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    // Create a manifest file
    const manifest = {
      name: projectName,
      exportedAt: new Date().toISOString(),
      fileCount: Object.keys(files).length,
      files: Object.keys(files),
    };
    await FileSystem.writeAsStringAsync(
      `${exportDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );

    return { success: true, path: exportDir };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// ===========================================
// APK DOWNLOAD FROM GITHUB
// ===========================================

export const downloadAPKFromGitHub = async (
  token: string,
  repoFullName: string,
  runId: number,
  onProgress?: (progress: number) => void
): Promise<APKDownloadResult> => {
  try {
    // Get artifacts list
    const artifactsRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!artifactsRes.ok) {
      throw new Error('Failed to get artifacts');
    }

    const artifactsData = await artifactsRes.json();
    const artifacts = artifactsData.artifacts || [];
    
    // Find APK artifact
    const apkArtifact = artifacts.find((a: any) => 
      a.name.toLowerCase().includes('apk') || 
      a.name.toLowerCase().includes('release') ||
      a.name.toLowerCase().includes('debug')
    );

    if (!apkArtifact) {
      throw new Error('No APK artifact found. Build may still be in progress.');
    }

    // Download artifact (returns a zip)
    onProgress?.(10);
    
    const downloadUrl = apkArtifact.archive_download_url;
    const downloadRes = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!downloadRes.ok) {
      throw new Error('Failed to download artifact');
    }

    onProgress?.(50);

    // Save to file system
    const fileName = `${repoFullName.replace('/', '-')}-${runId}.zip`;
    const filePath = `${FileSystem.documentDirectory}downloads/${fileName}`;
    
    // Create downloads directory
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}downloads`,
      { intermediates: true }
    );

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      downloadUrl,
      filePath,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    onProgress?.(100);

    if (downloadResult.status === 200) {
      return { success: true, path: downloadResult.uri };
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// ===========================================
// GET DOWNLOADED FILES
// ===========================================

export const getDownloadedFiles = async (): Promise<Array<{ name: string; path: string; size: number }>> => {
  try {
    const downloadsDir = `${FileSystem.documentDirectory}downloads`;
    const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
    
    if (!dirInfo.exists) return [];

    const files = await FileSystem.readDirectoryAsync(downloadsDir);
    const fileInfos = await Promise.all(
      files.map(async (name) => {
        const path = `${downloadsDir}/${name}`;
        const info = await FileSystem.getInfoAsync(path);
        return {
          name,
          path,
          size: (info as any).size || 0,
        };
      })
    );

    return fileInfos;
  } catch {
    return [];
  }
};

// ===========================================
// GET EXPORTED PROJECTS
// ===========================================

export const getExportedProjects = async (): Promise<Array<{ name: string; path: string; fileCount: number }>> => {
  try {
    const exportsDir = `${FileSystem.documentDirectory}exports`;
    const dirInfo = await FileSystem.getInfoAsync(exportsDir);
    
    if (!dirInfo.exists) return [];

    const projects = await FileSystem.readDirectoryAsync(exportsDir);
    const projectInfos = await Promise.all(
      projects.map(async (name) => {
        const path = `${exportsDir}/${name}`;
        try {
          const manifestPath = `${path}/manifest.json`;
          const manifestContent = await FileSystem.readAsStringAsync(manifestPath);
          const manifest = JSON.parse(manifestContent);
          return {
            name: manifest.name || name,
            path,
            fileCount: manifest.fileCount || 0,
          };
        } catch {
          return { name, path, fileCount: 0 };
        }
      })
    );

    return projectInfos;
  } catch {
    return [];
  }
};

// ===========================================
// PREPARE MEDIA FOR AI ANALYSIS
// ===========================================

export const prepareMediaForAI = async (media: MediaFile): Promise<{
  type: string;
  data: string;
  mimeType: string;
}> => {
  let base64 = media.base64;
  
  if (!base64) {
    // Read file as base64
    base64 = await FileSystem.readAsStringAsync(media.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return {
    type: media.type,
    data: base64,
    mimeType: media.mimeType || 'application/octet-stream',
  };
};

export default {
  pickImage,
  pickVideo,
  pickAudio,
  pickDocument,
  takePhoto,
  recordVideo,
  exportProjectToStorage,
  downloadAPKFromGitHub,
  getDownloadedFiles,
  getExportedProjects,
  prepareMediaForAI,
};
