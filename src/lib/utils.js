export function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

export function randomizedDelay(baseSeconds) {
  const jitter = baseSeconds * 0.3;
  const delay = baseSeconds - Math.random() * jitter;
  return Math.round(delay);
}

export function log(message) {
  console.log(`[${new Date().toISOString()}]`, message);
}

export function secondsUntilActiveHours(startHour, endHour) {
  const now = new Date();
  const hour = now.getHours();
  const inActive = startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;

  if (inActive) return 0;

  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (hour < startHour) {
    next.setHours(startHour);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(startHour);
  }
  return Math.ceil((next - now) / 1000);
}

export function computeNextRunTime(delaySeconds, startHour, endHour) {
  const candidate = new Date(Date.now() + delaySeconds * 1000);
  const hour = candidate.getHours();
  const inActive = startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;

  if (inActive) return candidate;

  const next = new Date(candidate);
  next.setMinutes(0, 0, 0);
  if (hour < startHour) {
    next.setHours(startHour);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(startHour);
  }
  return next;
}

export function isSocketHangupError(err) {
  return err.code === 'ECONNRESET' || 
         err.code === 'ENOTFOUND' || 
         err.code === 'ETIMEDOUT' ||
         err.message.includes('socket hang up') ||
         err.message.includes('network') ||
         err.message.includes('connection');
}