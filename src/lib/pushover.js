import fetch from 'node-fetch';
import { log } from './utils.js';

const PUSHOVER_API = 'https://api.pushover.net/1/messages.json';

export function createPushoverNotifier(userKey, appToken) {
  const enabled = Boolean(userKey && appToken);

  if (enabled) {
    log('Pushover emergency alerts enabled');
  }

  async function send({ message, title, priority = 0 }) {
    if (!enabled) return;
    const body = new URLSearchParams({
      token: appToken,
      user: userKey,
      message,
      title: title || 'Visa Bot',
      priority: String(priority),
      sound: 'persistent',
    });

    if (priority === 2) {
      body.set('retry', '30');
      body.set('expire', '10800');
    }

    try {
      const res = await fetch(PUSHOVER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = await res.json();
      if (json.status !== 1) {
        log(`Pushover error (${res.status}): ${JSON.stringify(json)}`);
      } else {
        log(`Pushover sent (receipt: ${json.receipt || 'n/a'})`);
      }
    } catch (err) {
      log(`Pushover notification failed: ${err.message}`);
    }
  }

  return {
    notifyDateFoundEmergency: (date, facilityName) =>
      send({
        title: '🚨 Earlier visa date!',
        message: `${date} at ${facilityName}`,
        priority: 2,
      }),
  };
}
