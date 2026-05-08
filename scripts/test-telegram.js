import { getConfig } from '../src/lib/config.js';
import { createTelegramNotifier } from '../src/lib/telegram.js';
import { log } from '../src/lib/utils.js';

const config = getConfig();
const telegram = createTelegramNotifier(config.telegramBotToken, config.telegramChatId);

const currentDate = '2026-08-15';

const samplePerFacilityNoDates = config.facilityIds.map((id, i) => ({
  facilityId: id,
  earliest: i % 2 === 0 ? '2026-09-01' : null,
}));

const samplePerFacilityWithDates = config.facilityIds.map((id, i) => ({
  facilityId: id,
  earliest: i === 1 ? '2026-07-10' : '2026-09-01',
}));

const sampleCandidate = {
  date: '2026-07-10',
  facilityId: config.facilityIds[1] || '66',
};

const sampleNextRun = new Date(Date.now() + 3600 * 1000);

log('Sending: cycle status (no earlier dates)');
await telegram.notifyCycleStatus(samplePerFacilityNoDates, currentDate, null, sampleNextRun);

log('Sending: cycle status (earlier date found)');
await telegram.notifyCycleStatus(samplePerFacilityWithDates, currentDate, sampleCandidate, sampleNextRun);

log('Sending: date found notification');
await telegram.notifyDateFound(sampleCandidate.date, currentDate, sampleCandidate.facilityId);

log('Sending: booking success notification');
await telegram.notifyBookingSuccess(sampleCandidate.date, '09:30', sampleCandidate.facilityId);

log('Sending: bot stopped notification');
await telegram.notifyBotStopped('Test run complete');

log('All test messages sent. Check your Telegram.');
