import { GraphQLResolveInfo } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type ChatwootConversation = {
  __typename?: 'ChatwootConversation';
  contact_id?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  inbox_id: Scalars['Int']['output'];
  last_message_content?: Maybe<Scalars['String']['output']>;
  resolved?: Maybe<Scalars['Boolean']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type ChatwootMessage = {
  __typename?: 'ChatwootMessage';
  content?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  direction?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isAnonymous: Scalars['Boolean']['output'];
  message_type?: Maybe<Scalars['String']['output']>;
  sender_avatar?: Maybe<Scalars['String']['output']>;
  sender_name?: Maybe<Scalars['String']['output']>;
  sender_type?: Maybe<Scalars['String']['output']>;
};

export type ChatwootMessageList = {
  __typename?: 'ChatwootMessageList';
  messages: Array<ChatwootMessage>;
};

export type ChatwootMessageResult = {
  __typename?: 'ChatwootMessageResult';
  content?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type ChatwootNewConversationInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  initialMessage?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sourceId: Scalars['String']['input'];
};

export type ChatwootWidgetConfig = {
  __typename?: 'ChatwootWidgetConfig';
  baseUrl: Scalars['String']['output'];
  enforceUserIdentity: Scalars['Boolean']['output'];
  websiteToken?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createChatwootConversation: ChatwootConversation;
  createChatwootPublicConversation: ChatwootConversation;
  sendChatwootMessage: ChatwootMessageResult;
  sendChatwootPublicMessage: ChatwootMessageResult;
  toggleChatwootConversationStatus: Scalars['Boolean']['output'];
};


export type MutationCreateChatwootConversationArgs = {
  input: ChatwootNewConversationInput;
};


export type MutationCreateChatwootPublicConversationArgs = {
  input: ChatwootNewConversationInput;
};


export type MutationSendChatwootMessageArgs = {
  content: Scalars['String']['input'];
  conversationId: Scalars['ID']['input'];
  messageType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSendChatwootPublicMessageArgs = {
  content: Scalars['String']['input'];
  conversationId: Scalars['ID']['input'];
};


export type MutationToggleChatwootConversationStatusArgs = {
  conversationId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  chatwootConversations: Array<ChatwootConversation>;
  chatwootIdentityHash: Scalars['String']['output'];
  chatwootMessages: ChatwootMessageList;
  chatwootPublicConversation?: Maybe<ChatwootConversation>;
  chatwootPublicMessages: Array<ChatwootMessage>;
  chatwootWidgetConfig: ChatwootWidgetConfig;
};


export type QueryChatwootConversationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryChatwootIdentityHashArgs = {
  identifier: Scalars['String']['input'];
};


export type QueryChatwootMessagesArgs = {
  conversationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryChatwootPublicConversationArgs = {
  sourceId: Scalars['String']['input'];
};


export type QueryChatwootPublicMessagesArgs = {
  conversationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ChatwootConversation: ResolverTypeWrapper<ChatwootConversation>;
  ChatwootMessage: ResolverTypeWrapper<ChatwootMessage>;
  ChatwootMessageList: ResolverTypeWrapper<ChatwootMessageList>;
  ChatwootMessageResult: ResolverTypeWrapper<ChatwootMessageResult>;
  ChatwootNewConversationInput: ChatwootNewConversationInput;
  ChatwootWidgetConfig: ResolverTypeWrapper<ChatwootWidgetConfig>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  ChatwootConversation: ChatwootConversation;
  ChatwootMessage: ChatwootMessage;
  ChatwootMessageList: ChatwootMessageList;
  ChatwootMessageResult: ChatwootMessageResult;
  ChatwootNewConversationInput: ChatwootNewConversationInput;
  ChatwootWidgetConfig: ChatwootWidgetConfig;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  Query: {};
  String: Scalars['String']['output'];
};

export type ChatwootConversationResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChatwootConversation'] = ResolversParentTypes['ChatwootConversation']> = {
  contact_id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inbox_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  last_message_content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolved?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChatwootMessageResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChatwootMessage'] = ResolversParentTypes['ChatwootMessage']> = {
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  direction?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAdmin?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isAnonymous?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sender_avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sender_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sender_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChatwootMessageListResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChatwootMessageList'] = ResolversParentTypes['ChatwootMessageList']> = {
  messages?: Resolver<Array<ResolversTypes['ChatwootMessage']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChatwootMessageResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChatwootMessageResult'] = ResolversParentTypes['ChatwootMessageResult']> = {
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChatwootWidgetConfigResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChatwootWidgetConfig'] = ResolversParentTypes['ChatwootWidgetConfig']> = {
  baseUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enforceUserIdentity?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  websiteToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createChatwootConversation?: Resolver<ResolversTypes['ChatwootConversation'], ParentType, ContextType, RequireFields<MutationCreateChatwootConversationArgs, 'input'>>;
  createChatwootPublicConversation?: Resolver<ResolversTypes['ChatwootConversation'], ParentType, ContextType, RequireFields<MutationCreateChatwootPublicConversationArgs, 'input'>>;
  sendChatwootMessage?: Resolver<ResolversTypes['ChatwootMessageResult'], ParentType, ContextType, RequireFields<MutationSendChatwootMessageArgs, 'content' | 'conversationId' | 'messageType'>>;
  sendChatwootPublicMessage?: Resolver<ResolversTypes['ChatwootMessageResult'], ParentType, ContextType, RequireFields<MutationSendChatwootPublicMessageArgs, 'content' | 'conversationId'>>;
  toggleChatwootConversationStatus?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationToggleChatwootConversationStatusArgs, 'conversationId'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  chatwootConversations?: Resolver<Array<ResolversTypes['ChatwootConversation']>, ParentType, ContextType, RequireFields<QueryChatwootConversationsArgs, 'limit'>>;
  chatwootIdentityHash?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<QueryChatwootIdentityHashArgs, 'identifier'>>;
  chatwootMessages?: Resolver<ResolversTypes['ChatwootMessageList'], ParentType, ContextType, RequireFields<QueryChatwootMessagesArgs, 'conversationId' | 'limit'>>;
  chatwootPublicConversation?: Resolver<Maybe<ResolversTypes['ChatwootConversation']>, ParentType, ContextType, RequireFields<QueryChatwootPublicConversationArgs, 'sourceId'>>;
  chatwootPublicMessages?: Resolver<Array<ResolversTypes['ChatwootMessage']>, ParentType, ContextType, RequireFields<QueryChatwootPublicMessagesArgs, 'conversationId' | 'limit'>>;
  chatwootWidgetConfig?: Resolver<ResolversTypes['ChatwootWidgetConfig'], ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  ChatwootConversation?: ChatwootConversationResolvers<ContextType>;
  ChatwootMessage?: ChatwootMessageResolvers<ContextType>;
  ChatwootMessageList?: ChatwootMessageListResolvers<ContextType>;
  ChatwootMessageResult?: ChatwootMessageResultResolvers<ContextType>;
  ChatwootWidgetConfig?: ChatwootWidgetConfigResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

