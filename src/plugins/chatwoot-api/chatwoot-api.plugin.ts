
import { PluginCommonModule, Type, VendurePlugin, RuntimeVendureConfig } from '@vendure/core';


import { CHATWOOT_API_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { ChatwootService } from './chatwoot.service';
import { ChatwootResolver } from './chatwoot.resolver';
import { adminSchema } from './schemas/admin.schema';
import { shopSchema } from './schemas/shop.schema';

import { chatwootUiExtension } from './ui-extension';

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
        schema: shopSchema,
        resolvers: [ChatwootResolver],
    },
    adminApiExtensions: {
        schema: adminSchema,
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

    static ui = chatwootUiExtension;
}
