import { User } from './types';

/**
 * Canonical demo users — always available regardless of app state.
 * These are used to seed the app AND as a fallback for login.
 */
export const DEMO_USERS: User[] = [
  {
    username: 'citizen',
    password: 'password123',
    role: 'citizen',
    vehicleType: 'Car',
    vehicleNo: 'KA-01-AB-1234',
    name: 'Demo Citizen',
  },
  {
    username: 'ambulance',
    password: 'sos123',
    role: 'citizen',
    vehicleType: 'Ambulance',
    vehicleNo: 'KA-02-EM-9999',
    name: 'Demo Ambulance Driver',
  },
  {
    username: 'police',
    password: 'police123',
    role: 'control',
    vehicleType: 'Govt',
    vehicleNo: 'POLICE-01',
    name: 'Insp. Rajesh Kumar',
    policeId: 'BLR-4521',
    area: 'Silk Board Area',
  },
];

export const DEMO_CITIZEN_USERS = DEMO_USERS.filter(u => u.role === 'citizen');
export const DEMO_CONTROL_USERS = DEMO_USERS.filter(u => u.role === 'control');