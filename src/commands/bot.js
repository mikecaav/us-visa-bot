import { Bot } from '../lib/bot.js';
import { getConfig } from '../lib/config.js';
import { createTelegramNotifier } from '../lib/telegram.js';
import { getFacilityName } from '../lib/facilities.js';
import { log, sleep, randomizedDelay, isSocketHangupError, secondsUntilActiveHours, computeNextRunTime } from '../lib/utils.js';

const COOLDOWN = 3600; // 1 hour in seconds

export async function botCommand(options) {
  const config = getConfig();
  const bot = new Bot(config, { dryRun: options.dryRun });
  const telegram = createTelegramNotifier(config.telegramBotToken, config.telegramChatIds);
  let currentBookedDate = options.current;
  const targetDate = options.target;
  const minDate = options.min;
  let loginFailures = options._loginFailures || 0;

  log(`Initializing with current date ${currentBookedDate}`);
  log(`Monitoring ${config.facilityIds.length} facilities: ${config.facilityIds.map(getFacilityName).join(', ')}`);
  log(`Active hours: ${config.activeHoursStart}:00 - ${config.activeHoursEnd}:00`);

  if (options.dryRun) {
    log(`[DRY RUN MODE] Bot will only log what would be booked without actually booking`);
  }

  if (targetDate) {
    log(`Target date: ${targetDate}`);
  }

  if (minDate) {
    log(`Minimum date: ${minDate}`);
  }

  try {
    const sessionHeaders = await bot.initialize();
    loginFailures = 0;

    if (!currentBookedDate) {
      log('No --current provided, fetching from site...');
      currentBookedDate = await bot.getCurrentAppointmentDate(sessionHeaders);
      if (!currentBookedDate) {
        throw new Error('Could not auto-detect current appointment date. Please pass --current YYYY-MM-DD.');
      }
      log(`Auto-detected current appointment: ${currentBookedDate}`);
    }

    while (true) {
      const sleepSeconds = secondsUntilActiveHours(config.activeHoursStart, config.activeHoursEnd);
      if (sleepSeconds > 0) {
        log(`Outside active hours. Sleeping for ${Math.round(sleepSeconds / 60)} minutes`);
        await sleep(sleepSeconds);
        continue;
      }

      const { bestCandidate, perFacility } = await bot.checkAvailableDate(
        sessionHeaders,
        currentBookedDate,
        minDate
      );

      const delay = randomizedDelay(config.refreshDelay);
      const nextRun = computeNextRunTime(delay, config.activeHoursStart, config.activeHoursEnd);
      await telegram.notifyCycleStatus(perFacility, currentBookedDate, bestCandidate, nextRun);

      if (bestCandidate) {
        const bookedTime = await bot.bookAppointment(sessionHeaders, bestCandidate);

        if (bookedTime) {
          await telegram.notifyBookingSuccess(bestCandidate.date, bookedTime, bestCandidate.facilityId);
          log(`Booked ${bestCandidate.date} at ${getFacilityName(bestCandidate.facilityId)}. Continuing to look for earlier dates.`);
          currentBookedDate = bestCandidate.date;
          options = { ...options, current: currentBookedDate };

          if (targetDate && bestCandidate.date <= targetDate) {
            const msg = `Target date reached (${targetDate}). Stopping bot.`;
            log(msg);
            await telegram.notifyBotStopped(msg);
            process.exit(0);
          }
        }
      }

      log(`waiting ${delay} seconds before next check`);
      await sleep(delay);
    }
  } catch (err) {
    if (isSocketHangupError(err)) {
      log(`Socket hangup error: ${err.message}. Trying again after ${COOLDOWN} seconds...`);
      await sleep(COOLDOWN);
      loginFailures = 0;
    } else {
      loginFailures++;
      log(`Session/authentication error: ${err.message} (failure ${loginFailures}/${config.maxLoginFailures})`);

      if (loginFailures >= config.maxLoginFailures) {
        const msg = `${loginFailures} consecutive login failures. Stopping bot.`;
        log(msg);
        await telegram.notifyBotStopped(msg);
        process.exit(1);
      }

      const cooldown = randomizedDelay(config.authCooldown);
      log(`Auth cooldown: waiting ${cooldown} seconds before retry...`);
      await sleep(cooldown);
    }

    options._loginFailures = loginFailures;
    return botCommand(options);
  }
}
