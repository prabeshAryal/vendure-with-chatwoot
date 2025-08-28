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
    /** Optional alternate Chatwoot API Access Token to use when sending agent/admin messages (lets you attribute messages to a specific agent user). */
    agentApiToken?: string;
    /** Optional alternate Account ID to pair with agentApiToken (if agent token belongs to different Chatwoot account). */
    agentAccountId?: number;
    /** Chatwoot Account ID (numeric). */
    accountId: number;
    /** Target Inbox ID where new conversations should be created (numeric). */
    inboxId: number;
    /** Enable verbose logging (default false). */
    enableLogging?: boolean;
    /** Optional Chatwoot website widget token to expose via GraphQL for storefront embedding. */
    websiteToken?: string;
    /** If set, HMAC token used to generate identifier hash for user identity validation (do NOT expose to clients). */
    hmacToken?: string;
    /** If true, GraphQL will enforce identity validation and expose an identity hash query. */
    enforceUserIdentity?: boolean;
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
    name?: string | null;
    /** Optional email for the contact. */
    email?: string | null;
    /** First message content to post right after conversation creation. */
    initialMessage?: string | null;
}

