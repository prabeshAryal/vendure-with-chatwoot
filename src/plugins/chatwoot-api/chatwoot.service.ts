import { Logger } from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';
// Resolve a working fetch implementation (global fetch in Node 18+, else node-fetch default export)
let fetchFn: any = (globalThis as any).fetch;
if (typeof fetchFn !== 'function') {
    try {
        // node-fetch v3 is ESM; require returns an object with a default
        const mod = require('node-fetch');
        fetchFn = mod.default || mod;
    } catch (e) {
        // Will surface later when attempting a request
    }
}
import { loggerCtx } from './constants';
import { ChatwootNewConversationInput, PluginInitOptions } from './types';
import { threadCpuUsage } from 'process';

export class ChatwootService {
    private static memoryConversations: Array<{ id: number; inbox_id?: number; contact_id?: number; source_id?: string }> = [];
    private static memoryMessages: Map<number, Map<number, any>> = new Map();
    private static memoryContacts: Map<string, any> = new Map(); // Session continuity
    private static availableAgents: any[] = [];
    private static cacheLoaded = false;
    private static cacheFile = path.join(process.cwd(), 'chatwoot-cache.json');
    // Throttle & diagnostics helpers
    private static lastFetch: Map<number, number> = new Map();
    private static fallbackLogCounts: Map<number, number> = new Map();
    constructor(private readonly options: PluginInitOptions) {}

    private headers() {
        return {
            'Content-Type': 'application/json',
            // Prefer agent token if performing admin/agent operations downstream; default to primary token
            'api_access_token': this.options.apiToken,
        } as Record<string, string>;
    }

    private log(message: string, meta?: any) {
        // Logging removed for production cleanliness
    }

    private async ensureCacheLoaded() {
        if (ChatwootService.cacheLoaded) return;
        ChatwootService.cacheLoaded = true;
        try {
            if (fs.existsSync(ChatwootService.cacheFile)) {
                const raw = await fs.promises.readFile(ChatwootService.cacheFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.conversations)) {
                    ChatwootService.memoryConversations = parsed.conversations;
                }
                if (parsed.messages && typeof parsed.messages === 'object') {
                    const map = new Map<number, Map<number, any>>();
                    for (const [cid, arr] of Object.entries(parsed.messages)) {
                        const inner = new Map<number, any>();
                        if (Array.isArray(arr)) {
                            for (const m of arr) {
                                if (m && typeof m === 'object' && typeof (m as any).id === 'number') {
                                    inner.set((m as any).id, m);
                                }
                            }
                        }
                        map.set(Number(cid), inner);
                    }
                    ChatwootService.memoryMessages = map;
                }
                if (parsed.contacts && typeof parsed.contacts === 'object') {
                    ChatwootService.memoryContacts = new Map(Object.entries(parsed.contacts));
                }
                // Logging removed
            }
            // Load available agents on startup
            await this.refreshAgents();
        } catch (e) {
            this.log('Failed to load Chatwoot cache', { error: (e as Error).message });
        }
    }

    private async persistCache() {
        try {
            const serializableMessages: Record<string, any[]> = {};
            for (const [cid, map] of ChatwootService.memoryMessages.entries()) {
                serializableMessages[cid] = Array.from(map.values());
            }
            const serializableContacts = Object.fromEntries(ChatwootService.memoryContacts);
            const payload = {
                conversations: ChatwootService.memoryConversations,
                messages: serializableMessages,
                contacts: serializableContacts,
            };
            await fs.promises.writeFile(ChatwootService.cacheFile, JSON.stringify(payload, null, 2), 'utf8');
        } catch (e) {
            this.log('Failed to persist Chatwoot cache', { error: (e as Error).message });
        }
    }

    async createConversation(input: ChatwootNewConversationInput) {
        try {
            await this.ensureCacheLoaded();
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations`;
            this.log('Creating Chatwoot conversation', { url, inboxId: this.options.inboxId });
            
            // Extract session ID from source ID for session continuity
            const sessionId = input.sourceId.includes('-') ? input.sourceId.split('-').pop() : input.sourceId;
            const contactId = await this.ensureContact(input.email, input.name, sessionId);
            this.log('Ensured contact for conversation', { contactId, sessionId });
            const body: any = {
                inbox_id: this.options.inboxId,
                contact_id: contactId,
                source_id: input.sourceId,
            };
            // this.log('Request body', body);
            const res = await fetchFn(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
            if (!res.ok) {
                const text = await res.text();
                if (res.status === 404) {
                    const diag: any = {};
                    diag.accounts = await this.listAccountsSafe();
                    diag.inboxes = await this.listInboxesSafe();
                    // Retry minimal body
                    try {
                        const minimalBody = { inbox_id: this.options.inboxId, contact_id: contactId };
                        const retryRes = await fetchFn(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(minimalBody) });
                        if (retryRes.ok) {
                            const conv: any = await retryRes.json();
                            if (input.initialMessage && (conv as any)?.id) {
                                await this.sendMessage((conv as any).id, input.initialMessage);
                            }
                            return conv as any;
                        } else {
                            diag.retry = { status: retryRes.status, body: await retryRes.text() };
                        }
                    } catch (e) {
                        diag.retry = { error: (e as Error).message };
                    }
                    const error = `Chatwoot createConversation failed: 404 ${text}. Diagnostics: ${JSON.stringify(diag)}`;
                    this.log('ERROR: ' + error);
                    throw new Error(error);
                }
                const error = `Chatwoot createConversation failed: ${res.status} ${text}`;
                this.log('ERROR: ' + error);
                throw new Error(error);
            }
            const conversation: any = await res.json();
            if (input.initialMessage && (conversation as any)?.id) {
                await this.sendMessage((conversation as any).id, input.initialMessage, 'outgoing');
            }
            // Cache conversation locally for fallback listing
            if (conversation?.id) {
                ChatwootService.memoryConversations.unshift({ 
                    id: conversation.id, 
                    inbox_id: conversation.inbox_id, 
                    contact_id: contactId,
                    source_id: input.sourceId 
                });
                this.persistCache();
            }
            return conversation as any;
        } catch (error) {
            this.log('createConversation error', { error: (error as Error).message });
            throw error;
        }
    }

    async sendMessage(conversationId: number, content: string, messageType: 'outgoing' | 'incoming' = 'outgoing', extra?: { content_attributes?: any }) {
    await this.ensureCacheLoaded();
        const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${conversationId}/messages`;
        this.log('Sending Chatwoot message', { conversationId, messageType });
        const body: any = { content, message_type: messageType };
        if (extra?.content_attributes) body.content_attributes = extra.content_attributes;
    const res = await fetchFn(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Chatwoot sendMessage failed: ${res.status} ${text}`);
        }
    const json: any = await res.json();
        // Cache the sent message optimistically
        try {
            if (json?.id) {
                const convCache = ChatwootService.memoryMessages.get(conversationId) ?? new Map<number, any>();
                convCache.set(json.id, json);
                ChatwootService.memoryMessages.set(conversationId, convCache);
                this.persistCache();
            }
        } catch {}
        return json;
    }

    async listConversations(limit = 10) {
        await this.ensureCacheLoaded();
        const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations?assignee_type=all&include=contact,last_message&status=all&sort=last_activity_at&order=descending&page=1&per_page=${limit}`;
        this.log('Listing Chatwoot conversations', { limit, include: 'contact,last_message' });
        const res = await fetchFn(url, { headers: this.headers() });
        if (!res.ok) {
            const text = await res.text();
            if (res.status === 404) {
                // Treat as no conversations (clear cache to avoid ghost items)
                if (ChatwootService.memoryConversations.length) {
                    ChatwootService.memoryConversations = [];
                    this.persistCache();
                }
                return [];
            }
            throw new Error(`Chatwoot listConversations failed: ${res.status} ${text}`);
        }
        const json: any = await res.json();
        this.log('Raw Chatwoot API response', json);
        let items: any[] = [];
        if (Array.isArray(json)) items = json;
        else if (Array.isArray(json?.data?.payload)) items = json.data.payload;
        else if (Array.isArray(json?.data)) items = json.data;
        else if (Array.isArray(json?.payload?.data)) items = json.payload.data;
        else if (Array.isArray(json?.payload?.conversations)) items = json.payload.conversations;
        else if (Array.isArray(json?.payload)) items = json.payload;

        if (!items.length) {
            // Empty remote result is authoritative: clear cache to prevent stale display
            if (ChatwootService.memoryConversations.length) {
                this.log('Clearing stale conversation cache (remote empty)');
                ChatwootService.memoryConversations = [];
                this.persistCache();
            }
            return [];
        }

        const mapped = items.map(c => {
            const lastMessageContent = c.last_message?.content || c.last_message?.message || c.last_message_content;
            const updatedAtRaw = c.last_activity_at || c.updated_at || (c.last_message ? c.last_message.created_at : undefined);
            const updated_at = updatedAtRaw
                ? new Date(
                      // Distinguish seconds vs ms
                      updatedAtRaw > 1e12 ? updatedAtRaw : updatedAtRaw * 1000,
                  ).toISOString()
                : undefined;
            return {
                id: c.id,
                inbox_id: c.inbox_id,
                contact_id: c.contact_id || c.contact?.id,
                last_message_content: lastMessageContent,
                updated_at,
                status: c.status,
                meta: c.meta || {},
            };
        });
        // this.log('Conversations normalized', { count: mapped.length });
        mapped.forEach(c => {
            if (c?.id && !ChatwootService.memoryConversations.find(mc => mc.id === c.id)) {
                ChatwootService.memoryConversations.push({ id: c.id, inbox_id: c.inbox_id, contact_id: c.contact_id });
            }
        });
        this.persistCache();
        return mapped;
    }

    async getConversation(id: number): Promise<any | undefined> {
        await this.ensureCacheLoaded();
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${id}`;
            const res = await fetchFn(url, { headers: this.headers() });
            if (!res.ok) {
                if (res.status === 404) return undefined;
                const text = await res.text();
                throw new Error(`Chatwoot getConversation failed: ${res.status} ${text}`);
            }
            const json: any = await res.json();
            // Normalize minimal fields we rely on
            return {
                id: json.id,
                status: json.status || (json.resolved ? 'resolved' : 'open'),
                resolved: !!json.resolved || json.status === 'resolved',
                inbox_id: json.inbox_id,
                contact_id: json.contact_id || json.contact?.id,
                source_id: json.source_id,
                meta: json.meta || {},
            };
        } catch (e) {
            this.log('getConversation error', { id, error: (e as Error).message });
            throw e;
        }
    }

    async listMessages(conversationId: number, limit = 20) {
    const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${conversationId}/messages?page=1&per_page=${limit}`;
        // this.log('Listing Chatwoot messages', { conversationId, limit });
        const res = await fetchFn(url, { headers: this.headers() });
        if (!res.ok) {
            const text = await res.text();
            if (res.status === 404) {
                return [];
            }
            throw new Error(`Chatwoot listMessages failed: ${res.status} ${text}`);
        }
        const json: any = await res.json();
        let items: any[] = [];
        if (Array.isArray(json?.payload)) items = json.payload;
        else if (Array.isArray(json)) items = json;
        else if (Array.isArray(json?.data)) items = json.data;
        return this.decorateMessages(conversationId, items, limit);
    }

    // Always fetch remote (no throttle) for real-time public chat refreshes
    async listMessagesFresh(conversationId: number, limit = 20) {
    const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${conversationId}/messages?page=1&per_page=${limit}`;
        const res = await fetchFn(url, { headers: this.headers() });
        if (!res.ok) {
            const text = await res.text();
            if (res.status === 404) return [];
            throw new Error(`Chatwoot listMessagesFresh failed: ${res.status} ${text}`);
        }
        const rawText = await res.clone().text();
        // this.log('Raw Chatwoot API response', { url, rawText });
        const json: any = await res.json();
        // this.log('Parsed Chatwoot API response', { url, keys: Object.keys(json), sample: Array.isArray(json?.payload) ? json.payload.slice(0,3) : json });
        let items: any[] = [];
        if (Array.isArray(json?.payload)) items = json.payload;
        else if (Array.isArray(json)) items = json;
        else if (Array.isArray(json?.data)) items = json.data;
        // this.log('Extracted items for decoration', { count: items.length, ids: items.map(m=>m.id) });
        // Only use live API items, no cache fallback or merge
        const decorated = this.decorateMessages(conversationId, items, limit * 2);
        // this.log('Decorated messages', { count: decorated.length, ids: decorated.map(m=>m.id), sample: decorated.slice(0,3) });
        return decorated;
    }

    private decorateMessages(conversationId: number, items: any[], limit: number) {
        const decorated = items.map(m => {
            const direction = m.message_type === 0 ? 'incoming' : 'outgoing';
            const side = direction === 'incoming' ? 'visitor' : 'agent';
            const sender_name = m.sender?.name || (side === 'agent' ? 'Agent' : 'You');
            return {
                id: m.id,
                content: m.content,
                created_at: m.created_at,
                message_type: direction, // use the string 'incoming' or 'outgoing'
                direction: direction,
                side: side,
                sender_name: sender_name,
                // for debugging
                original_message_type: m.message_type,
                sender_type: m.sender?.type,
            };
        }).sort((a, b) => a.id - b.id);
        return decorated;
    }

    private async listAccountsSafe() {
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts`;
            const res = await fetchFn(url, { headers: this.headers() });
            if (!res.ok) return { status: res.status };
            return await res.json();
        } catch (e) {
            return { error: (e as Error).message };
        }
    }

    private async listInboxesSafe() {
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/inboxes`;
            const res = await fetchFn(url, { headers: this.headers() });
            if (!res.ok) return { status: res.status };
            return await res.json();
        } catch (e) {
            return { error: (e as Error).message };
        }
    }

    // --- Enhanced contact helpers ---
    private async ensureContact(email?: string, name?: string, sessionId?: string): Promise<number | undefined> {
        // Use session-based contact management if sessionId provided
        if (sessionId) {
            return this.ensureContactWithSession(sessionId, name, email);
        }
        
        // Fallback to original logic
        if (email) {
            const found = await this.findContactByEmail(email);
            if (found?.id) return found.id;
        }
        const created = await this.createContact({ name, email });
        if (created?.id) return created.id;
        return undefined;
    }

    private async findContactByEmail(email: string): Promise<any | undefined> {
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/contacts/search?q=${encodeURIComponent(email)}`;
            this.log('Searching contact by email', { email, url });
            const res = await fetchFn(url, { headers: this.headers() });
            if (!res.ok) return undefined;
            const json: any = await res.json();
            if (Array.isArray(json?.data)) {
                return json.data.find((c: any) => c.email === email) || json.data[0];
            }
            if (Array.isArray(json)) {
                return json.find((c: any) => c.email === email) || json[0];
            }
            return undefined;
        } catch {
            return undefined;
        }
    }

    private async createContact(input: { name?: string; email?: string; custom_attributes?: any }): Promise<any | undefined> {
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/contacts`;
            const body: any = {};
            if (input.name) body.name = input.name;
            if (input.email) body.email = input.email;
            if (input.custom_attributes) body.custom_attributes = input.custom_attributes;
            if (!body.name && !body.email) body.name = 'Anonymous';
            
            this.log('Creating contact', body);
            const res = await fetchFn(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
            if (!res.ok) {
                this.log('Failed to create contact', { status: res.status });
                return undefined;
            }
            const json: any = await res.json();
            // Chatwoot contact create shapes observed:
            // { id: number, ... }
            // { contact: { id, ... }, ... }
            // { payload: { contact: { id, ... } } }
            let id: number | undefined;
            let contactData: any = json;
            if (typeof json?.id === 'number') {
                id = json.id;
            } else if (typeof json?.contact?.id === 'number') {
                id = json.contact.id;
                contactData = json.contact;
            } else if (typeof json?.payload?.contact?.id === 'number') {
                id = json.payload.contact.id;
                contactData = json.payload.contact;
            } else if (typeof json?.payload?.id === 'number') {
                id = json.payload.id;
                contactData = json.payload;
            }
            
            const extracted = { id, rawKeys: Object.keys(json || {}) };
            this.log('Contact create response parsed', extracted);
            return { ...contactData, id };
        } catch {
            return undefined;
        }
    }

    private async createConversationViaContact(contactId: number, sourceId: string, inboxId: number) {
        const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/contacts/${contactId}/conversations`;
        const body: any = { source_id: sourceId, inbox_id: inboxId };
        this.log('Creating conversation via contact', { url, contactId });
    const res = await fetchFn(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Fallback contact conversation failed: ${res.status} ${text}`);
        }
        return res.json();
    }

    // Public interface helpers
    async findConversationBySourceId(sourceId: string): Promise<any | undefined> {
        await this.ensureCacheLoaded();
        // Check memory cache first
        const cached = ChatwootService.memoryConversations.find(c => 
            c.source_id === sourceId
        );
        if (cached) return cached;

        // Search via API (if available)
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations?q=${encodeURIComponent(sourceId)}&include=contact,last_message`;
            const res = await fetchFn(url, { headers: this.headers() });
            if (res.ok) {
                const json: any = await res.json();
                const items = json?.data || json?.payload || (Array.isArray(json) ? json : []);
                const found = items.find((c: any) => c.source_id === sourceId);
                if (found) return found;
            }
        } catch {}
        return undefined;
    }

    async sendPublicMessage(conversationId: number, content: string) {
        return await this.sendMessage(conversationId, content, 'incoming');
    }

    async sendAdminMessage(conversationId: number, content: string) {
        // Get or create a default agent for admin messages
        const agent = await this.getAvailableAgent();
        if (agent) {
            this.log('Admin message sent by agent', { agentId: agent.id, agentName: agent.name });
        }
        // Admin panel always uses the main apiToken
        return this.sendMessage(conversationId, content, 'outgoing');
    }

    async toggleConversationStatus(conversationId: number): Promise<boolean> {
        const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${conversationId}/toggle_status`;
        const res = await fetchFn(url, { method: 'POST', headers: this.headers() });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`toggle_status_failed ${res.status} ${text}`);
        }
        return true;
    }

    // Enhanced agent management
    private async refreshAgents() {
        try {
            const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/agents`;
            const res = await fetchFn(url, { headers: this.headers() });
            if (res.ok) {
                const json: any = await res.json();
                const agents = json?.data || json?.payload || (Array.isArray(json) ? json : []);
                ChatwootService.availableAgents = agents.filter((a: any) => 
                    a.availability_status === 'available' || a.availability_status === 'online'
                );
                this.log('Refreshed agent list', { 
                    total: agents.length, 
                    available: ChatwootService.availableAgents.length 
                });
            }
        } catch (e) {
            this.log('Failed to refresh agents', { error: (e as Error).message });
        }
    }

    private async getAvailableAgent(): Promise<any | undefined> {
        if (ChatwootService.availableAgents.length === 0) {
            await this.refreshAgents();
        }
        return ChatwootService.availableAgents[0]; // Return first available agent
    }

    // Enhanced contact management with session continuity
    async ensureContactWithSession(sessionId: string, name?: string, email?: string): Promise<number | undefined> {
        await this.ensureCacheLoaded();
        
        // Check if we already have a contact for this session
        const cached = ChatwootService.memoryContacts.get(sessionId);
        if (cached?.id) {
            this.log('Using cached contact for session', { sessionId, contactId: cached.id });
            return cached.id;
        }

        // Try to find existing contact by email
        if (email) {
            const found = await this.findContactByEmail(email);
            if (found?.id) {
                ChatwootService.memoryContacts.set(sessionId, found);
                this.persistCache();
                return found.id;
            }
        }

        // Create new contact with enhanced attributes
        const contactData = {
            name: name || `Website Visitor ${sessionId.slice(-6)}`,
            email,
            custom_attributes: {
                session_id: sessionId,
                source: 'website_chat',
                first_seen: new Date().toISOString(),
            }
        };

        const created = await this.createContact(contactData);
        if (created?.id) {
            ChatwootService.memoryContacts.set(sessionId, created);
            this.persistCache();
            this.log('Created new contact with session', { 
                sessionId, 
                contactId: created.id, 
                name: contactData.name 
            });
            return created.id;
        }
        return undefined;
    }

    // Enhanced message listing with meta information
    async listMessagesWithMeta(conversationId: number, limit = 20): Promise<{ messages: any[], meta?: any }> {
        await this.ensureCacheLoaded();
        // Remove after/before parameters which caused empty payloads in some Chatwoot deployments
        const url = `${this.options.baseUrl}/api/v1/accounts/${this.options.accountId}/conversations/${conversationId}/messages?page=1&per_page=${limit}`;
        const res = await fetchFn(url, { headers: this.headers() });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Chatwoot listMessages failed: ${res.status} ${text}`);
        }
        const json: any = await res.json();
        let items: any[] = [];
        let meta: any = {};
        if (json?.payload && Array.isArray(json.payload)) {
            items = json.payload;
            meta = json.meta || {};
        } else if (Array.isArray(json)) {
            items = json;
        } else if (Array.isArray(json?.data)) {
            items = json.data;
        }
        // Reuse existing decoration logic to keep parity with public chat
        const decorated = this.decorateMessages(conversationId, items, limit);
        return { messages: decorated.slice(-limit), meta };
    }

}
