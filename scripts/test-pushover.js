import { getConfig } from '../src/lib/config.js';
import { createPushoverNotifier } from '../src/lib/pushover.js';
import { log } from '../src/lib/utils.js';

const config = getConfig();
const pushover = createPushoverNotifier(config.pushoverUserKey, config.pushoverAppToken);

log('Sending: Pushover emergency alert test');
await pushover.notifyDateFoundEmergency('2026-07-10', 'Mexico City');
log('Done. Check your phone for a loud, persistent alarm.');
