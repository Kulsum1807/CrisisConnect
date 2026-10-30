// All user roles in the system.
// USER: citizen who reports emergencies
// RESPONDER: verified person who handles incidents
// ADMIN: operator who manages the whole system
export const ROLES = {
  USER: 'USER',
  RESPONDER: 'RESPONDER',
  ADMIN: 'ADMIN',
};

// Array form for Mongoose enum validation
export const ROLE_VALUES = Object.values(ROLES);
