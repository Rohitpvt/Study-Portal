import { AVATARS } from '../constants/avatars';

export const FALLBACK_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';

export const resolveUserAvatar = (userProfile) => {
  if (!userProfile) return FALLBACK_AVATAR;

  // 1. Uploaded S3 avatars take total precedence
  if (userProfile.avatar_type === 'uploaded' && userProfile.avatar_url) {
    return userProfile.avatar_url;
  }

  // 2. Preset or Animated avatars mapping to ID
  if (userProfile.avatar_id) {
    const matched = AVATARS.find((a) => a.id === userProfile.avatar_id);
    if (matched) return matched.url;
  }

  return FALLBACK_AVATAR;
};

export const handleAvatarError = (e) => {
  e.target.onerror = null; // Prevent infinite loop
  e.target.src = FALLBACK_AVATAR;
};

export const getOnlineStatus = (lastSeenEpoch) => {
  if (!lastSeenEpoch) return false;
  const now = Math.floor(Date.now() / 1000);
  return (now - lastSeenEpoch) < 120; // 2 minutes window
};
