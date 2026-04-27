import { type AxiosResponse } from 'axios';
import apiClient from './apiClient';
import type { Appointment } from '../models/Appointment';

const BASE_URL = '/appointments';

export async function getUpcomingAppointments(petId: string): Promise<Appointment[]> {
  try {
    const response: AxiosResponse<{ data: Appointment[] }> = await apiClient.get(
      `${BASE_URL}?petId=${petId}`
    );
    
    // Sort by date ascending and filter out past dates
    const now = new Date();
    const upcoming = response.data.data
      .filter(a => new Date(`${a.date}T${a.time}`) >= now)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      
    return upcoming;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    return [];
  }
}
