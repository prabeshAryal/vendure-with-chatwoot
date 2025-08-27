import * as path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { PluginCommonModule, Type, VendurePlugin, RuntimeVendureConfig } from '@vendure/core';
import gql from 'graphql-tag';

import { CHATWOOT_API_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { ChatwootService } from './chatwoot.service';
import { ChatwootResolver } from './chatwoot.resolver';
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: CHATWOOT_API_PLUGIN_OPTIONS, useFactory: () => ChatwootApiPlugin.options },
        {
            provide: ChatwootService,
            useFactory: () => new ChatwootService(ChatwootApiPlugin.options),
        },
    ],
    shopApiExtensions: {
        schema: gql`
            type ChatwootConversation {
                id: ID!
                inbox_id: Int!
                contact_id: Int
                last_message_content: String
                updated_at: String
            }

            input ChatwootNewConversationInput {
                sourceId: String!
                name: String
                email: String
                initialMessage: String
            }

            type ChatwootMessageResult {
                id: ID!
                content: String
            }
            type ChatwootMessage {
                id: ID!
                content: String
                message_type: String
                sender_type: String
                direction: String
                isAdmin: Boolean!
                isAnonymous: Boolean!
            }

            type ChatwootWidgetConfig {
                baseUrl: String!
                websiteToken: String
            }

            extend type Query {
                chatwootConversations(limit: Int = 10): [ChatwootConversation!]!
                chatwootPublicConversation(sourceId: String!): ChatwootConversation
                chatwootPublicMessages(conversationId: ID!, limit: Int = 20): [ChatwootMessage!]!
                chatwootWidgetConfig: ChatwootWidgetConfig!
                chatwootMessages(conversationId: ID!, limit: Int = 20): [ChatwootMessage!]!
            }

            extend type Mutation {
                createChatwootConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
                createChatwootPublicConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
                sendChatwootMessage(conversationId: ID!, content: String!, messageType: String = "outgoing"): ChatwootMessageResult!
                sendChatwootPublicMessage(conversationId: ID!, content: String!): ChatwootMessageResult!
            }
            `,
        resolvers: [ChatwootResolver],
    },
    adminApiExtensions: {
        schema: gql`
            type ChatwootConversation {
                id: ID!
                inbox_id: Int!
                contact_id: Int
                last_message_content: String
                updated_at: String
            }
            input ChatwootNewConversationInput {
                sourceId: String!
                name: String
                email: String
                initialMessage: String
            }
            type ChatwootMessageResult { id: ID! content: String }
            type ChatwootMessage { id: ID! content: String message_type: String sender_type: String direction: String isAdmin: Boolean! isAnonymous: Boolean! }
            type ChatwootWidgetConfig { baseUrl: String! websiteToken: String }
            extend type Query {
                chatwootConversations(limit: Int = 10): [ChatwootConversation!]!
                chatwootPublicConversation(sourceId: String!): ChatwootConversation
                chatwootPublicMessages(conversationId: ID!, limit: Int = 20): [ChatwootMessage!]!
                chatwootWidgetConfig: ChatwootWidgetConfig!
                chatwootMessages(conversationId: ID!, limit: Int = 20): [ChatwootMessage!]!
            }
            extend type Mutation {
                createChatwootConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
                createChatwootPublicConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
                sendChatwootMessage(conversationId: ID!, content: String!, messageType: String = "outgoing"): ChatwootMessageResult!
                sendChatwootPublicMessage(conversationId: ID!, content: String!): ChatwootMessageResult!
            }
        `,
        resolvers: [ChatwootResolver],
    },
    configuration: (config: RuntimeVendureConfig) => config,
    compatibility: '^3.0.0',
})
export class ChatwootApiPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<ChatwootApiPlugin> {
        this.options = options;
        return ChatwootApiPlugin;
    }

    static ui: AdminUiExtension = {
        id: 'chatwoot-api-ui',
        extensionPath: path.join(__dirname, 'ui'),
        routes: [{ route: 'chatwoot-api', filePath: 'routes.ts' }],
        providers: ['providers.ts'],
    };
}
