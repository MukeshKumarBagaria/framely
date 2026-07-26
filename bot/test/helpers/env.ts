// Import this first in every test file. `config.ts` validates the environment
// at import time (deliberately — a missing secret should be a startup crash),
// so the fake values have to be in place before anything pulls it in.
process.env.NODE_ENV ??= "test";
process.env.WA_PHONE_NUMBER_ID ??= "100000000000000";
process.env.WA_WABA_ID ??= "200000000000000";
process.env.WA_TOKEN ??= "test-token";
process.env.WA_VERIFY_TOKEN ??= "verify-token-0123456789abcdef";
process.env.WA_APP_SECRET ??= "app-secret-for-tests";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/giftmahal_test";
process.env.ADMIN_API_TOKEN ??= "admin-token-0123456789abcdef";
process.env.STORAGE_ROOT ??= "/tmp/giftmahal-test";
process.env.LOG_LEVEL ??= "silent";
process.env.CRON_ENABLED ??= "false";
process.env.WORKER_ENABLED ??= "false";
process.env.ENABLED_LANGS ??= "all";

export {};
