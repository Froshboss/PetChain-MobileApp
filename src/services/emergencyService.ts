import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { Linking, Platform, PermissionsAndroid } from 'react-native';

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  address?: string;
  type: 'vet' | 'clinic' | 'emergency' | 'poison-control';
  available24h?: boolean;
}

export interface VetClinic {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  distance?: number;
  rating?: number;
  available24h?: boolean;
}

interface Location {
  latitude: number;
  longitude: number;
}

const FAVORITES_KEY = '@emergency_favorites';
const EMERGENCY_CONTACTS_KEY = '@emergency_contacts';

class EmergencyService {
  private static instance: EmergencyService;

  static getInstance(): EmergencyService {
    if (!EmergencyService.instance) {
      EmergencyService.instance = new EmergencyService();
    }
    return EmergencyService.instance;
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const stored = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
      if (stored) return JSON.parse(stored);

      // Default emergency contacts
      const defaultContacts: EmergencyContact[] = [
        {
          id: '1',
          name: 'Pet Poison Helpline',
          phoneNumber: '855-764-7661',
          type: 'poison-control',
          available24h: true
        },
        {
          id: '2',
          name: 'ASPCA Animal Poison Control',
          phoneNumber: '888-426-4435',
          type: 'poison-control',
          available24h: true
        }
      ];

      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(defaultContacts));
      return defaultContacts;
    } catch (error) {
      throw new Error('Failed to fetch emergency contacts');
    }
  }

  async getNearbyVetClinics(
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<VetClinic[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockClinics: VetClinic[] = [
        {
          id: 'clinic1',
          name: 'Emergency Vet Clinic',
          address: '123 Main St',
          phoneNumber: '555-0100',
          latitude: latitude + 0.01,
          longitude: longitude + 0.01,
          available24h: true,
          rating: 4.5
        },
        {
          id: 'clinic2',
          name: 'City Animal Hospital',
          address: '456 Oak Ave',
          phoneNumber: '555-0200',
          latitude: latitude - 0.02,
          longitude: longitude - 0.02,
          available24h: false,
          rating: 4.8
        }
      ];

      // Calculate distances and filter by radius
      const clinicsWithDistance = mockClinics.map(clinic => ({
        ...clinic,
        distance: this.calculateDistance(latitude, longitude, clinic.latitude, clinic.longitude)
      })).filter(clinic => clinic.distance! <= radius);

      return clinicsWithDistance.sort((a, b) => a.distance! - b.distance!);
    } catch (error) {
      throw new Error('Failed to fetch nearby clinics');
    }
  }

  async saveFavoriteContact(contact: EmergencyContact): Promise<void> {
    try {
      const favorites = await this.getFavoriteContacts();
      const exists = favorites.find(f => f.id === contact.id);
      
      if (!exists) {
        favorites.push(contact);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      throw new Error('Failed to save favorite contact');
    }
  }

  async removeFavoriteContact(contactId: string): Promise<void> {
    try {
      const favorites = await this.getFavoriteContacts();
      const filtered = favorites.filter(f => f.id !== contactId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (error) {
      throw new Error('Failed to remove favorite contact');
    }
  }

  async getFavoriteContacts(): Promise<EmergencyContact[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  callEmergencyContact(phoneNumber: string): void {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          throw new Error('Phone call not supported');
        }
      })
      .catch(() => {
        throw new Error('Failed to initiate call');
      });
  }

  navigateToClinic(address: string): void {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`
    });

    if (url) {
      Linking.canOpenURL(url)
        .then(supported => {
          if (supported) {
            Linking.openURL(url);
          } else {
            // Fallback to Google Maps web
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
          }
        })
        .catch(() => {
          throw new Error('Failed to open navigation');
        });
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOS handles permissions differently
    } catch (error) {
      return false;
    }
  }

  async getCurrentLocation(): Promise<Location> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        error => reject(new Error('Failed to get location')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default EmergencyService.getInstance();
