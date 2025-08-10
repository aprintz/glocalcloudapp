export interface NotificationZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  message: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lastSeen: Date;
  isOnline: boolean;
  distanceFromZone?: number; // distance to nearest active zone in meters
}

export interface NotificationHistory {
  id: string;
  zoneName: string;
  message: string;
  timestamp: Date;
  distance: number; // distance when notification was triggered
}