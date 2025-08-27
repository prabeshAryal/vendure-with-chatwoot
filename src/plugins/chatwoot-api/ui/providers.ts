import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuItem({
        id: 'chatwoot',
        label: 'Chatwoot',
        routerLink: ['/extensions/chatwoot-api'],
        icon: 'chat-bubble',
    }, 'marketing'),
];
