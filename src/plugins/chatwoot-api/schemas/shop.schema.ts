import gql from 'graphql-tag';

export const shopSchema = gql`
    type ChatwootConversation {
        id: ID!
        inbox_id: Int!
        contact_id: Int
        last_message_content: String
        updated_at: String
        status: String
        resolved: Boolean
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
        created_at: String
        message_type: String
        sender_type: String
        direction: String
        sender_name: String
        sender_avatar: String
        isAdmin: Boolean!
        isAnonymous: Boolean!
    }

    type ChatwootMessageList {
        messages: [ChatwootMessage!]!
    }

    type ChatwootWidgetConfig {
        baseUrl: String!
        websiteToken: String
        enforceUserIdentity: Boolean!
    }

    extend type Query {
        chatwootConversations(limit: Int = 10): [ChatwootConversation!]!
        chatwootPublicConversation(sourceId: String!): ChatwootConversation
        chatwootPublicMessages(conversationId: ID!, limit: Int = 20): [ChatwootMessage!]!
        chatwootWidgetConfig: ChatwootWidgetConfig!
        chatwootMessages(conversationId: ID!, limit: Int = 20): ChatwootMessageList!
        chatwootIdentityHash(identifier: String!): String!
    }

    extend type Mutation {
        createChatwootConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
        createChatwootPublicConversation(input: ChatwootNewConversationInput!): ChatwootConversation!
        sendChatwootMessage(conversationId: ID!, content: String!, messageType: String = "outgoing"): ChatwootMessageResult!
        sendChatwootPublicMessage(conversationId: ID!, content: String!): ChatwootMessageResult!
        toggleChatwootConversationStatus(conversationId: ID!): Boolean!
    }
`;
