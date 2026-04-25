import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import petService from '../services/petService';
import { OptimizedImage } from './OptimizedImage';

interface PetPhotoUploaderProps {
  petId: string;
  currentPhotoUrl?: string;
  currentThumbnailUrl?: string;
  onPhotoUploaded?: (url: string) => void;
}

export const PetPhotoUploader: React.FC<PetPhotoUploaderProps> = ({
  petId,
  currentPhotoUrl,
  currentThumbnailUrl,
  onPhotoUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState(currentThumbnailUrl);

  const handleUpload = async () => {
    try {
      setUploading(true);
      const url = await petService.uploadPetPhoto(petId);
      
      if (url) {
        setPhotoUrl(url);
        // Note: petService.uploadPetPhoto returns main URL, 
        // we might need to fetch the updated pet to get the thumbnailUrl
        // but for now let's just update the main photo
        onPhotoUploaded?.(url);
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleUpload} disabled={uploading}>
      <View style={{ width: 120, height: 120, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
        {photoUrl ? (
          <OptimizedImage 
            uri={photoUrl} 
            thumbnailUri={thumbnailUrl}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>{uploading ? 'Uploading...' : 'Add Photo'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
