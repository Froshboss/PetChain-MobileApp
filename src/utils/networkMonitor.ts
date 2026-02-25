import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

type NetworkChangeCallback = (isOnline: boolean) => void;
type SyncCallback = () => void;

class NetworkMonitor {
  private unsubscribe: (() => void) | null = null;
  private callbacks: NetworkChangeCallback[] = [];
  private syncCallback: SyncCallback | null = null;
  private isCurrentlyOnline = false;

  startNetworkMonitoring(): void {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isCurrentlyOnline;
      this.isCurrentlyOnline = state.isConnected ?? false;

      // Trigger sync when coming online
      if (!wasOnline && this.isCurrentlyOnline && this.syncCallback) {
        this.syncCallback();
      }

      // Notify all callbacks
      this.callbacks.forEach(callback => callback(this.isCurrentlyOnline));
    });
  }

  stopNetworkMonitoring(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  async getNetworkType(): Promise<NetInfoStateType> {
    const state = await NetInfo.fetch();
    return state.type;
  }

  onNetworkChange(callback: NetworkChangeCallback): void {
    this.callbacks.push(callback);
  }

  setSyncCallback(callback: SyncCallback): void {
    this.syncCallback = callback;
  }

  removeNetworkChangeCallback(callback: NetworkChangeCallback): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  async getNetworkQuality(): Promise<'wifi' | 'cellular' | 'unknown'> {
    const state = await NetInfo.fetch();
    switch (state.type) {
      case NetInfoStateType.wifi:
        return 'wifi';
      case NetInfoStateType.cellular:
        return 'cellular';
      default:
        return 'unknown';
    }
  }
}

// Singleton instance
const networkMonitor = new NetworkMonitor();

// Export functions
export const startNetworkMonitoring = (): void => networkMonitor.startNetworkMonitoring();
export const stopNetworkMonitoring = (): void => networkMonitor.stopNetworkMonitoring();
export const isOnline = (): Promise<boolean> => networkMonitor.isOnline();
export const getNetworkType = (): Promise<NetInfoStateType> => networkMonitor.getNetworkType();
export const onNetworkChange = (callback: NetworkChangeCallback): void => networkMonitor.onNetworkChange(callback);
export const setSyncCallback = (callback: SyncCallback): void => networkMonitor.setSyncCallback(callback);
export const removeNetworkChangeCallback = (callback: NetworkChangeCallback): void => networkMonitor.removeNetworkChangeCallback(callback);
export const getNetworkQuality = (): Promise<'wifi' | 'cellular' | 'unknown'> => networkMonitor.getNetworkQuality();

export default networkMonitor;