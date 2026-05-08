import fetch from 'node-fetch';
import { log } from './utils.js';
import { getFacilityName } from './facilities.js';

export function createTelegramNotifier(botToken, chatId) {
  const enabled = Boolean(botToken && chatId);

  if (enabled) {
    log('Telegram notifications enabled');
  }

  async function send(text) {
    if (!enabled) return;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
    } catch (err) {
      log(`Telegram notification failed: ${err.message}`);
    }
  }

  return {
    notifyDateFound: (date, currentDate, facilityId) =>
      send(`🟢 *Earlier date found!*\nDate: ${date}\nFacility: ${getFacilityName(facilityId)}\nCurrent appointment: ${currentDate}\n\n_Attempting to book..._`),
    notifyCycleStatus: (perFacility, currentDate, bestCandidate, nextRun) => {
      const header = bestCandidate
        ? `🟢 *Cycle complete — earlier date found!*`
        : `🔍 *Cycle complete — no earlier dates*`;
      const lines = perFacility.map(f =>
        f.earliest
          ? `• ${getFacilityName(f.facilityId)}: earliest ${f.earliest}`
          : `• ${getFacilityName(f.facilityId)}: no availability`
      );
      const nextRunLine = nextRun
        ? `\n\n_Next run: ${nextRun.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}_`
        : '';
      return send(`${header}\nCurrent appointment: ${currentDate}\n\n${lines.join('\n')}${nextRunLine}`);
    },
    notifyBookingSuccess: (date, time, facilityId) =>
      send(`✅ *Appointment booked:* ${date} at ${time}\nFacility: ${getFacilityName(facilityId)}`),
    notifyBotStopped: (reason) =>
      send(`🛑 *Bot stopped:* ${reason}`),
    send
  };
}
