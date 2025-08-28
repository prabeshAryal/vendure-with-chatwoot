export {};

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ENV: string;
            PORT: string;
            COOKIE_SECRET: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            CHATWOOT_BASE_URL: string;
            CHATWOOT_API_TOKEN: string;
            CHATWOOT_AGENT_API_TOKEN?: string;
            CHATWOOT_AGENT_ACCOUNT_ID?: string;
            CHATWOOT_ACCOUNT_ID: string;
            CHATWOOT_INBOX_ID: string;
            CHATWOOT_WEBSITE_TOKEN?: string;
            CHATWOOT_HMAC_TOKEN?: string;
            CHATWOOT_ENFORCE_USER_IDENTITY?: string; // 'true' | 'false'
        }
    }
}
