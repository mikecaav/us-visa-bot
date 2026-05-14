import { VisaHttpClient } from './client.js';
import { createTelegramNotifier } from './telegram.js';
import { createPushoverNotifier } from './pushover.js';
import { getFacilityName } from './facilities.js';
import { log, sleep } from './utils.js';

const FACILITY_REQUEST_BASE_SECONDS = 2;
const FACILITY_REQUEST_JITTER_PCT = 0.3;

export class Bot {
  constructor(config, options = {}) {
    this.config = config;
    this.dryRun = options.dryRun || false;
    this.client = new VisaHttpClient(this.config.countryCode, this.config.email, this.config.password);
    this.telegram = createTelegramNotifier(config.telegramBotToken, config.telegramChatIds);
    this.pushover = createPushoverNotifier(config.pushoverUserKey, config.pushoverAppToken);
  }

  async initialize() {
    log('Initializing visa bot...');
    return await this.client.login();
  }

  async getCurrentAppointmentDate(sessionHeaders) {
    return await this.client.getCurrentAppointmentDate(sessionHeaders, this.config.scheduleId);
  }

  async checkAvailableDate(sessionHeaders, currentBookedDate, minDate) {
    let bestCandidate = null;
    const perFacility = [];

    for (let i = 0; i < this.config.facilityIds.length; i++) {
      const facilityId = this.config.facilityIds[i];
      log(`checking ${getFacilityName(facilityId)}`);

      const dates = await this.client.checkAvailableDate(
        sessionHeaders,
        this.config.scheduleId,
        facilityId
      );

      if (i < this.config.facilityIds.length - 1) {
        const jitter = FACILITY_REQUEST_BASE_SECONDS * FACILITY_REQUEST_JITTER_PCT;
        const delay = FACILITY_REQUEST_BASE_SECONDS + (Math.random() * 2 - 1) * jitter;
        await sleep(delay);
      }

      if (!dates || dates.length === 0) {
        log(`${getFacilityName(facilityId)}: no dates available`);
        perFacility.push({ facilityId, earliest: null });
        continue;
      }

      const sortedDates = [...dates].sort();
      const earliestRaw = sortedDates[0];
      perFacility.push({ facilityId, earliest: earliestRaw });
      log(`${getFacilityName(facilityId)}: earliest available is ${earliestRaw}`);

      const goodDates = dates.filter(date => this._isAcceptableDate(date, currentBookedDate, minDate));

      if (goodDates.length === 0) {
        continue;
      }

      goodDates.sort();
      const earliest = goodDates[0];

      if (!bestCandidate || earliest < bestCandidate.date) {
        bestCandidate = { date: earliest, facilityId };
      }
    }

    if (bestCandidate) {
      log(`best candidate: ${bestCandidate.date} at ${getFacilityName(bestCandidate.facilityId)}`);
      await this.telegram.notifyDateFound(bestCandidate.date, currentBookedDate, bestCandidate.facilityId);
      await this.pushover.notifyDateFoundEmergency(bestCandidate.date, getFacilityName(bestCandidate.facilityId));
    }

    return { bestCandidate, perFacility };
  }

  _isAcceptableDate(date, currentBookedDate, minDate) {
    if (date >= currentBookedDate) return false;
    if (minDate && date < minDate) return false;

    if (this.config.minDateDifference > 0) {
      const diffDays = (new Date(currentBookedDate) - new Date(date)) / (1000 * 60 * 60 * 24);
      if (diffDays < this.config.minDateDifference) return false;
    }

    return true;
  }

  async bookAppointment(sessionHeaders, candidate) {
    const { date, facilityId } = candidate;
    const time = await this.client.checkAvailableTime(
      sessionHeaders,
      this.config.scheduleId,
      facilityId,
      date
    );

    if (!time) {
      log(`no available time slots for date ${date} at ${getFacilityName(facilityId)}`);
      return null;
    }

    if (this.dryRun) {
      log(`[DRY RUN] Would book appointment at ${getFacilityName(facilityId)} ${date} ${time} (not actually booking)`);
      return time;
    }

    await this.client.book(
      sessionHeaders,
      this.config.scheduleId,
      facilityId,
      date,
      time
    );

    log(`booked time at ${getFacilityName(facilityId)} ${date} ${time}`);
    return time;
  }
}
