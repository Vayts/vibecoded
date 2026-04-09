import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../client/client';
import { compressImage } from '../media/compressImage';

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

interface UploadAvatarResponse {
  path?: string;
  error?: string;
}

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as UploadAvatarResponse | null;
  return json?.error ?? 'Unable to upload avatar';
};

export const selectAndUploadAvatarImage = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Please allow photo library access to choose an avatar');
  }

  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });

  if (pickerResult.canceled || !pickerResult.assets[0]) {
    return null;
  }

  const asset = pickerResult.assets[0];
  const compressed = await compressImage(asset.uri, asset.width ?? 0, asset.height ?? 0);
  const formData = new FormData();
  const avatarFile: ReactNativeFile = {
    uri: compressed.uri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  };

  formData.append('avatar', avatarFile as unknown as Blob);

  const response = await apiFetch('/api/storage/avatars', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = (await response.json()) as UploadAvatarResponse;

  if (!json.path) {
    throw new Error('Avatar upload failed');
  }

  return json.path;
};