import { Routes } from '@angular/router';
import { ChatwootConversationsComponent } from './chatwoot-conversations.component';
import { ChatwootHomeComponent } from './chatwoot-home.component';

const routes: Routes = [
    { path: '', pathMatch: 'full', component: ChatwootHomeComponent, data: { breadcrumb: 'Chat' } },
    { path: 'conversations', component: ChatwootConversationsComponent, data: { breadcrumb: 'Conversations' } },
];

export default routes;
