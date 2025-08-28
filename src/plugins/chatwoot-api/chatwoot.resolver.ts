import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChatwootService } from './chatwoot.service';
import { ChatwootApiPlugin } from './chatwoot-api.plugin';
import * as crypto from 'crypto';

@Resolver()
export class ChatwootResolver {
    constructor(private readonly chatwootService: ChatwootService) {}

    @Mutation('resolveChatwootConversation')
    async resolveChatwootConversation(@Args('conversationId') conversationId: string) {
        // Use Chatwoot internal API to resolve conversation
        const fetchImpl: any = (global as any).fetch || ((): any => { try { const nf = require('node-fetch'); return nf.default || nf; } catch { return undefined; } })();
        if (!fetchImpl) throw new Error('fetch_unavailable');
        const opts: any = ChatwootApiPlugin.options;
        const url = `${opts.baseUrl}/api/v1/accounts/${opts.accountId}/conversations/${conversationId}/toggle_status`;
        const r = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api_access_token': opts.apiToken } });
        const raw = await r.text();
        if (!r.ok) throw new Error(`resolve_failed: ${raw}`);
        return true;
    }

    // Admin API resolvers
    @Query('chatwootConversations')
    async chatwootConversations(@Args('limit') limit?: number) {
        const result: any[] = await this.chatwootService.listConversations(limit ?? 10);
        return Array.isArray(result) ? result : [];
    }

    @Query('chatwootMessages')
    async chatwootMessages(@Args('conversationId') conversationId: string, @Args('limit') limit?: number) {
        return this.chatwootService.listMessagesWithMeta(Number(conversationId), limit ?? 50);
    }

    @Mutation('sendChatwootMessage')
    async sendChatwootMessage(
        @Args('conversationId') conversationId: string,
        @Args('content') content: string,
        @Args('messageType') messageType?: string,
    ) {
        // Admin interface - always send as agent (outgoing)
        return this.chatwootService.sendAdminMessage(Number(conversationId), content);
    }

    // Public API resolvers
    @Query('chatwootPublicConversation')
    async chatwootPublicConversation(@Args('sourceId') sourceId: string) {
        return this.chatwootService.findConversationBySourceId(sourceId);
    }

    @Query('chatwootPublicMessages')
    async chatwootPublicMessages(@Args('conversationId') conversationId: string, @Args('limit') limit?: number) {
        return this.chatwootService.listMessages(Number(conversationId), limit ?? 20);
    }

    @Mutation('createChatwootPublicConversation')
    async createChatwootPublicConversation(@Args('input') input: any) {
        try {
            return await this.chatwootService.createConversation(input);
        } catch (error) {
            throw new Error(`Failed to create public conversation: ${(error as Error).message}`);
        }
    }

    @Mutation('sendChatwootPublicMessage')
    async sendChatwootPublicMessage(
        @Args('conversationId') conversationId: string,
        @Args('content') content: string,
    ) {
        return this.chatwootService.sendPublicMessage(Number(conversationId), content);
    }

    // Shared resolvers
    @Mutation('createChatwootConversation')
    async createChatwootConversation(@Args('input') input: any) {
        try {
            return await this.chatwootService.createConversation(input);
        } catch (error) {
            throw new Error(`Failed to create conversation: ${(error as Error).message}`);
        }
    }

    @Query('chatwootWidgetConfig')
    chatwootWidgetConfig() {
        const opts: any = ChatwootApiPlugin.options;
        return {
            baseUrl: opts.baseUrl,
            websiteToken: opts.websiteToken ?? null,
            enforceUserIdentity: !!opts.enforceUserIdentity,
        };
    }

    @Query('chatwootIdentityHash')
    chatwootIdentityHash(@Args('identifier') identifier: string) {
        const opts: any = ChatwootApiPlugin.options;
        if (!opts?.hmacToken) {
            throw new Error('identity_hmac_not_configured');
        }
        if (!identifier || identifier.length > 512) {
            throw new Error('invalid_identifier');
        }
        const h = crypto.createHmac('sha256', opts.hmacToken).update(identifier).digest('hex');
        return h;
    }
}
