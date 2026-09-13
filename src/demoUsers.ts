import { User } from './types';

export const DEMO_USERS: User[] = [
  {
    username: 'citizen',
    password: 'password123',
    role: 'citizen',
    vehicleType: 'Car',
    vehicleNo: 'KA-01-AB-1234',
    name: 'Demo Citizen',
    creditPoints: 85,
  },
  {
    username: 'ambulance',
    password: 'sos123',
    role: 'citizen',
    vehicleType: 'Ambulance',
    vehicleNo: 'KA-02-EM-9999',
    name: 'Demo Ambulance Driver',
    creditPoints: 120,
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