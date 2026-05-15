import fetch from 'node-fetch';
import { log } from './utils.js';
import { getFacilityName } from './facilities.js';

export function createTelegramNotifier(botToken, chatIds) {
  const ids = Array.isArray(chatIds) ? chatIds : (chatIds ? [chatIds] : []);
  const enabled = Boolean(botToken && ids.length > 0);

  if (enabled) {
    log(`Telegram notifications enabled (${ids.length} recipient${ids.length > 1 ? 's' : ''})`);
  }

  async function send(text) {
    if (!enabled) return;
    await Promise.all(ids.map(async (id) => {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: id, text, parse_mode: 'Markdown' })
        });
      } catch (err) {
        log(`Telegram notification failed for ${id}: ${err.message}`);
      }
    }));
  }

  return {
    notifyCycleStarted: () =>
      send(`🔄 Cycle started`),
    notifyDateFound: (date, currentDate, facilityId) =>
      send(`🚨 *EARLIER DATE — BOOK MANUALLY NOW*\nDate: ${date}\nFacility: ${getFacilityName(facilityId)}\nCurrent appointment: ${currentDate}\n\n_Bot does NOT book. Open the visa site and reschedule yourself._`),
    notifyCycleStatus: (perFacility, currentDate, bestCandidate, nextRun, durationSeconds) => {
      const header = bestCandidate
        ? `🟢 *Cycle complete — earlier date found!*`
        : `🔍 *Cycle complete — no earlier dates*`;
      const lines = perFacility.map(f =>
        f.earliest
          ? `• ${getFacilityName(f.facilityId)}: earliest ${f.earliest}`
          : `• ${getFacilityName(f.facilityId)}: no availability`
      );
      const durationLine = durationSeconds != null
        ? `\nDuration: ${durationSeconds.toFixed(1)}s`
        : '';
      const nextRunLine = nextRun
        ? `\n\n_Next run: ${nextRun.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}_`
        : '';
      return send(`${header}\nCurrent appointment: ${currentDate}${durationLine}\n\n${lines.join('\n')}${nextRunLine}`);
    },
    notifyBookingSuccess: (date, time, facilityId) =>
      send(`✅ *Appointment booked:* ${date} at ${time}\nFacility: ${getFacilityName(facilityId)}`),
    notifyBotStopped: (reason) =>
      send(`🛑 *Bot stopped:* ${reason}`),
    send
  };
}
