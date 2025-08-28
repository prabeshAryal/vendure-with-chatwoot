import * as path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

export const chatwootUiExtension: AdminUiExtension = {
    id: 'chatwoot-api-ui',
    extensionPath: path.join(__dirname, 'ui'),
    routes: [{ route: 'chatwoot-api', filePath: 'routes.ts' }],
    providers: ['providers.ts'],
};
