/**
 * @description
 * Initialization options for the Chatwoot API plugin.
 * All required to be supplied via ChatwootApiPlugin.init({ ... }).
 */
export interface PluginInitOptions {
    /** Base URL of your Chatwoot installation, e.g. https://app.chatwoot.com */
    baseUrl: string;
    /** Chatwoot API Access Token (account scoped). */
    apiToken: string;
    /** Chatwoot Account ID (numeric). */
    accountId: number;
    /** Target Inbox ID where new conversations should be created (numeric). */
    inboxId: number;
    /** Enable verbose logging (default false). */
    enableLogging?: boolean;
    /** Optional Chatwoot website widget token to expose via GraphQL for storefront embedding. */
    websiteToken?: string;
}

export interface ChatwootConversation {
    id: number;
    inbox_id: number;
    contact_inbox?: { id: number };
    messages?: Array<any>;
}

export interface ChatwootNewConversationInput {
    /** A unique string you control to group a visitor/contact (maps to source_id in Chatwoot). */
    sourceId: string;
    /** Optional name for the contact. */
    name?: string;
    /** Optional email for the contact. */
    email?: string;
    /** First message content to post right after conversation creation. */
    initialMessage?: string;
}

