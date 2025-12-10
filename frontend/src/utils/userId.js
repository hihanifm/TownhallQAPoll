const USER_ID_KEY = 'townhall_user_id';

export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // Generate a unique ID
    userId = generateUniqueId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

function generateUniqueId() {
  // Generate a unique ID using timestamp and random string
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${random2}`;
}

