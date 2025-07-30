import * as FileSystem from 'expo-file-system';

export async function downloadFile(
  remoteUri: string,
  filename: string
): Promise<string> {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  try {
    const { exists } = await FileSystem.getInfoAsync(fileUri);
    if (!exists) {
      await FileSystem.downloadAsync(remoteUri, fileUri);
    }
    return fileUri;
  } catch (error) {
    console.error('Download failed', error);
    throw error;
  }
}
