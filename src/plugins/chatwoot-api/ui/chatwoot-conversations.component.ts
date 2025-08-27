import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
    selector: 'vdr-chatwoot-conversations',
    standalone: true,
    imports: [CommonModule],
    template: `
        <h2 style="margin:0 0 1rem">Chatwoot Conversations</h2>
        <div *ngIf="loading">Loading...</div>
        <table *ngIf="!loading" class="table" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr><th style="text-align:left; padding:4px; border-bottom:1px solid #ccc;">ID</th><th style="text-align:left; padding:4px; border-bottom:1px solid #ccc;">Inbox</th></tr>
            </thead>
            <tbody>
                <tr *ngFor="let c of conversations">
                    <td style="padding:4px; border-bottom:1px solid #eee;">{{ c.id }}</td>
                    <td style="padding:4px; border-bottom:1px solid #eee;">{{ c.inbox_id }}</td>
                </tr>
            </tbody>
        </table>
    `,
})
export class ChatwootConversationsComponent {
    conversations: any[] = [];
    loading = true;

    constructor(private apollo: Apollo) {
        this.fetch();
    }

    private fetch() {
        this.apollo
            .query({ query: gql`query { chatwootConversations { id inbox_id } }` })
            .subscribe((result: any) => {
                this.conversations = result.data.chatwootConversations;
                this.loading = false;
            });
    }
}
