import bcrypt from 'bcrypt';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * Get profile of currently authenticated user.
 */
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user;
};

/**
 * Update current user's profile (name, phone).
 */
export const updateUserProfile = async (userId, updates) => {
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;

  const user = await User.findByIdAndUpdate(userId, allowedUpdates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return user;
};

/**
 * Change current user password.
 */
export const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Incorrect current password', 400, 'VALIDATION_ERROR');
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  // Also invalidate current refresh session so user logs in cleanly with new credentials
  user.refreshTokenHash = null;
  await user.save();

  return true;
};

/**
 * Retrieve emergency contacts for the user.
 */
export const getEmergencyContacts = async (userId) => {
  const user = await User.findById(userId).select('+emergencyContacts');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.emergencyContacts || [];
};

/**
 * Add a new emergency contact (max 5 contacts).
 */
export const addEmergencyContact = async (userId, contactData) => {
  const user = await User.findById(userId).select('+emergencyContacts');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.emergencyContacts && user.emergencyContacts.length >= 5) {
    throw new AppError('Cannot have more than 5 emergency contacts', 409, 'CONTACT_LIMIT_EXCEEDED');
  }

  // If newly added contact is designated as primary, clear primary status on all existing contacts
  if (contactData.isPrimary) {
    user.emergencyContacts.forEach((c) => {
      c.isPrimary = false;
    });
  }

  const newContact = {
    name: contactData.name,
    phone: contactData.phone,
    relationship: contactData.relationship,
    email: contactData.email || undefined,
    isPrimary: Boolean(contactData.isPrimary),
  };

  user.emergencyContacts.push(newContact);
  await user.save();

  return user.emergencyContacts[user.emergencyContacts.length - 1];
};

/**
 * Update an existing emergency contact.
 */
export const updateEmergencyContact = async (userId, contactId, updates) => {
  const user = await User.findById(userId).select('+emergencyContacts');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const contact = user.emergencyContacts ? user.emergencyContacts.id(contactId) : null;
  if (!contact) {
    throw new AppError('Emergency contact not found', 404, 'NOT_FOUND');
  }

  if (updates.isPrimary === true) {
    user.emergencyContacts.forEach((c) => {
      c.isPrimary = false;
    });
  }

  if (updates.name !== undefined) contact.name = updates.name;
  if (updates.phone !== undefined) contact.phone = updates.phone;
  if (updates.relationship !== undefined) contact.relationship = updates.relationship;
  if (updates.email !== undefined) contact.email = updates.email || undefined;
  if (updates.isPrimary !== undefined) contact.isPrimary = updates.isPrimary;

  await user.save();
  return contact;
};

/**
 * Delete an emergency contact.
 */
export const deleteEmergencyContact = async (userId, contactId) => {
  const user = await User.findById(userId).select('+emergencyContacts');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const contact = user.emergencyContacts ? user.emergencyContacts.id(contactId) : null;
  if (!contact) {
    throw new AppError('Emergency contact not found', 404, 'NOT_FOUND');
  }

  user.emergencyContacts.pull(contactId);
  await user.save();
  return true;
};

/**
 * Retrieve medical info for the authenticated user.
 * medicalInfo has select: false on the User schema, so we explicitly select it.
 */
export const getUserMedicalInfo = async (userId) => {
  const user = await User.findById(userId).select('+medicalInfo');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.medicalInfo || null;
};

/**
 * Replace the whole medicalInfo object for the authenticated user.
 */
export const updateUserMedicalInfo = async (userId, data) => {
  const user = await User.findById(userId).select('+medicalInfo');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  user.medicalInfo = {
    bloodGroup: data.bloodGroup || 'UNKNOWN',
    allergies: data.allergies || [],
    conditions: data.conditions || [],
    medications: data.medications || [],
    notes: data.notes || '',
    shareWithResponders: Boolean(data.shareWithResponders),
  };

  await user.save();
  return user.medicalInfo;
};

/**
 * Delete medical info completely for the authenticated user.
 */
export const deleteUserMedicalInfo = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  await User.findByIdAndUpdate(userId, { $unset: { medicalInfo: 1 } });
  return true;
};


