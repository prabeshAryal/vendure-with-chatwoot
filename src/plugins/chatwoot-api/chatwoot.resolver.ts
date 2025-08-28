import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChatwootService } from './chatwoot.service';
import { ChatwootApiPlugin } from './chatwoot-api.plugin';
import * as crypto from 'crypto';
import {
    MutationCreateChatwootConversationArgs,
    MutationCreateChatwootPublicConversationArgs,
    MutationSendChatwootMessageArgs,
    MutationSendChatwootPublicMessageArgs,
    MutationToggleChatwootConversationStatusArgs,
    QueryChatwootConversationsArgs,
    QueryChatwootIdentityHashArgs,
    QueryChatwootMessagesArgs,
    QueryChatwootPublicConversationArgs,
    QueryChatwootPublicMessagesArgs
} from './generated-types';

@Resolver()
export class ChatwootResolver {
    constructor(private readonly chatwootService: ChatwootService) {}

    @Mutation('toggleChatwootConversationStatus')
    async toggleChatwootConversationStatus(@Args() { conversationId }: MutationToggleChatwootConversationStatusArgs) {
        await this.chatwootService.toggleConversationStatus(Number(conversationId));
        return true;
    }

    // Admin API resolvers
    @Query('chatwootConversations')
    async chatwootConversations(@Args() { limit }: QueryChatwootConversationsArgs) {
        const result: any[] = await this.chatwootService.listConversations(limit ?? 10);
        return Array.isArray(result) ? result : [];
    }

    @Query('chatwootMessages')
    async chatwootMessages(@Args() { conversationId, limit }: QueryChatwootMessagesArgs) {
        const messages = await this.chatwootService.listMessages(Number(conversationId), limit ?? 50);
        return { messages };
    }

    @Mutation('sendChatwootMessage')
    async sendChatwootMessage(
        @Args() { conversationId, content }: MutationSendChatwootMessageArgs,
    ) {
        // Admin interface - always send as agent (outgoing)
        return this.chatwootService.sendAdminMessage(Number(conversationId), content);
    }

    // Public API resolvers
    @Query('chatwootPublicConversation')
    async chatwootPublicConversation(@Args() { sourceId }: QueryChatwootPublicConversationArgs) {
        return this.chatwootService.findConversationBySourceId(sourceId);
    }

    @Query('chatwootPublicMessages')
    async chatwootPublicMessages(@Args() { conversationId, limit }: QueryChatwootPublicMessagesArgs) {
        return this.chatwootService.listMessages(Number(conversationId), limit ?? 20);
    }

    @Mutation('createChatwootPublicConversation')
    async createChatwootPublicConversation(@Args() { input }: MutationCreateChatwootPublicConversationArgs) {
        try {
            return await this.chatwootService.createConversation(input);
        } catch (error) {
            throw new Error(`Failed to create public conversation: ${(error as Error).message}`);
        }
    }

    @Mutation('sendChatwootPublicMessage')
    async sendChatwootPublicMessage(
        @Args() { conversationId, content }: MutationSendChatwootPublicMessageArgs,
    ) {
        return this.chatwootService.sendPublicMessage(Number(conversationId), content);
    }

    // Shared resolvers
    @Mutation('createChatwootConversation')
    async createChatwootConversation(@Args() { input }: MutationCreateChatwootConversationArgs) {
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
    chatwootIdentityHash(@Args() { identifier }: QueryChatwootIdentityHashArgs) {
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