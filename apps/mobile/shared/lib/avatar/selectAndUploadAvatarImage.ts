import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../client/client';
import { compressImage } from '../media/compressImage';

export type AvatarImageSource = 'camera' | 'gallery';

interface UserAvatarFallbackSource {
  image?: string | null;
}

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

interface UploadAvatarResponse {
  path?: string;
  error?: string;
}

export const getUserFallbackAvatarImage = (
  user: UserAvatarFallbackSource | null | undefined,
): string | null => {
  if (!user) {
    return null;
  }

  return user.image ?? null;
};

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as UploadAvatarResponse | null;
  return json?.error ?? 'Unable to upload avatar';
};

const uploadAvatarAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
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

export const pickAndUploadAvatarImage = async (
  source: AvatarImageSource,
): Promise<string | null> => {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Please allow camera access to take a profile photo'
        : 'Please allow photo library access to choose an avatar',
    );
  }

  const pickerResult =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
          exif: false,
        });

  if (pickerResult.canceled || !pickerResult.assets[0]) {
    return null;
  }

  return uploadAvatarAsset(pickerResult.assets[0]);
};

export const selectAndUploadAvatarImage = async (): Promise<string | null> =>
  pickAndUploadAvatarImage('gallery');
