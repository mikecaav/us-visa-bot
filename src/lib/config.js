import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  const config = {
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    scheduleId: process.env.SCHEDULE_ID,
    facilityIds: (process.env.FACILITY_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
    countryCode: process.env.COUNTRY_CODE,
    refreshDelay: Number(process.env.REFRESH_DELAY || 3600),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    minDateDifference: Number(process.env.MIN_DATE_DIFFERENCE || 7),
    authCooldown: Number(process.env.AUTH_COOLDOWN || 300),
    maxLoginFailures: Number(process.env.MAX_LOGIN_FAILURES || 3),
    activeHoursStart: Number(process.env.ACTIVE_HOURS_START || 7),
    activeHoursEnd: Number(process.env.ACTIVE_HOURS_END || 23),
    pushoverUserKey: process.env.PUSHOVER_USER_KEY || '',
    pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || '',
  };

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  const required = ['email', 'password', 'scheduleId', 'countryCode'];
  const missing = required.filter(key => !config[key]);

  if (config.facilityIds.length === 0) {
    missing.push('facilityIds');
  }

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.map(k => k === 'facilityIds' ? 'FACILITY_IDS' : k.toUpperCase()).join(', ')}`);
    process.exit(1);
  }
}

export function getBaseUri(countryCode) {
  return `https://ais.usvisa-info.com/en-${countryCode}/niv`;
}
