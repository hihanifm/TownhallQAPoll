const PIN_STORAGE_PREFIX = 'townhall_survey_pin_';
const PIN_VALUE_PREFIX = 'townhall_survey_pin_value_';

const PARTICIPANT_PIN_STORAGE_PREFIX = 'townhall_survey_participant_pin_';
const PARTICIPANT_PIN_VALUE_PREFIX = 'townhall_survey_participant_pin_value_';

export function storeVerifiedPin(surveyId, pin) {
  if (!surveyId) return;
  const key = `${PIN_STORAGE_PREFIX}${surveyId}`;
  const pinKey = `${PIN_VALUE_PREFIX}${surveyId}`;
  localStorage.setItem(key, 'true');
  if (pin) localStorage.setItem(pinKey, pin);
}

export function getVerifiedPin(surveyId) {
  if (!surveyId) return null;
  const pinKey = `${PIN_VALUE_PREFIX}${surveyId}`;
  return localStorage.getItem(pinKey);
}

export function hasVerifiedPin(surveyId) {
  if (!surveyId) return false;
  const key = `${PIN_STORAGE_PREFIX}${surveyId}`;
  const verified = localStorage.getItem(key) === 'true';
  if (!verified) return false;
  const pin = getVerifiedPin(surveyId);
  if (!pin) {
    localStorage.removeItem(key);
    return false;
  }
  return true;
}

export function clearVerifiedPin(surveyId) {
  if (!surveyId) return;
  localStorage.removeItem(`${PIN_STORAGE_PREFIX}${surveyId}`);
  localStorage.removeItem(`${PIN_VALUE_PREFIX}${surveyId}`);
}

export function storeVerifiedParticipantPin(surveyId, pin) {
  if (!surveyId) return;
  const key = `${PARTICIPANT_PIN_STORAGE_PREFIX}${surveyId}`;
  const pinKey = `${PARTICIPANT_PIN_VALUE_PREFIX}${surveyId}`;
  localStorage.setItem(key, 'true');
  if (pin) localStorage.setItem(pinKey, pin);
}

export function getVerifiedParticipantPin(surveyId) {
  if (!surveyId) return null;
  const pinKey = `${PARTICIPANT_PIN_VALUE_PREFIX}${surveyId}`;
  return localStorage.getItem(pinKey);
}

export function hasVerifiedParticipantPin(surveyId) {
  if (!surveyId) return false;
  const key = `${PARTICIPANT_PIN_STORAGE_PREFIX}${surveyId}`;
  const verified = localStorage.getItem(key) === 'true';
  if (!verified) return false;
  const pin = getVerifiedParticipantPin(surveyId);
  if (!pin) {
    localStorage.removeItem(key);
    return false;
  }
  return true;
}

export function clearVerifiedParticipantPin(surveyId) {
  if (!surveyId) return;
  localStorage.removeItem(`${PARTICIPANT_PIN_STORAGE_PREFIX}${surveyId}`);
  localStorage.removeItem(`${PARTICIPANT_PIN_VALUE_PREFIX}${surveyId}`);
}
