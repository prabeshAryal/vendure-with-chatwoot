import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

const Q_CONVS = gql`query($limit:Int){ chatwootConversations(limit:$limit){ id inbox_id contact_id last_message_content updated_at } }`;
const Q_MSGS = gql`query($id:ID!,$limit:Int){ chatwootMessages(conversationId:$id, limit:$limit){ id content message_type direction isAdmin isAnonymous } }`;
const M_SEND = gql`mutation($id:ID!,$content:String!){ sendChatwootMessage(conversationId:$id, content:$content){ id content } }`;

@Component({
  selector: 'vdr-chatwoot-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div style="display:flex; height:calc(100vh - 140px); border:1px solid #ccc;">
    <div style="width:260px; border-right:1px solid #ccc; overflow:auto;">
      <div style="display:flex; padding:4px; gap:4px;">
        <button (click)="reload()">↻</button>
        <button (click)="newConversation()">＋</button>
      </div>
      <div *ngIf="loading()" style="padding:6px;">Loading...</div>
      <ul style="list-style:none; margin:0; padding:0;">
        <li *ngFor="let c of conversations()" (click)="select(c)" [style.background]= "c.id===selectedId()? '#eef':'transparent'" style="padding:6px; cursor:pointer; border-bottom:1px solid #eee;">
          <div style="font-weight:bold;">#{{c.id}}</div>
          <div style="font-size:12px; color:#666;" *ngIf="c.last_message_content">{{c.last_message_content | slice:0:40}}...</div>
          <div style="font-size:10px; color:#999;" *ngIf="c.updated_at">{{c.updated_at | date:'short'}}</div>
        </li>
      </ul>
    </div>
    <div style="flex:1; display:flex; flex-direction:column;">
      <div style="flex:1; overflow:auto; padding:8px; background:#fafafa;">
        <div *ngIf="!selectedId()" style="color:#666;">Select or create a conversation.</div>
        <div *ngFor="let m of messages()" style="margin:4px 0;">
          <div [style.background]="m.isAdmin ? '#d8f5d0':'#fff'" [style.borderColor]="m.isAdmin ? '#8bc34a':'#ddd'" style="display:inline-block; padding:6px 8px; border:1px solid #ddd; border-radius:6px; max-width:70%; white-space:pre-wrap;">
            <small style="display:block; font-size:10px; color:#666; margin-bottom:2px;">{{ m.isAdmin ? 'ADMIN' : 'ANON' }}</small>
            {{ m.content }}
          </div>
        </div>
      </div>
      <form (submit)="send($event)" style="display:flex; gap:4px; border-top:1px solid #ccc; padding:6px;">
        <input type="text" [(ngModel)]="draft" name="draft" placeholder="Type message..." style="flex:1; padding:6px;" [disabled]="!selectedId()">
        <button type="submit" [disabled]="!draft || !selectedId()">Send</button>
      </form>
    </div>
  </div>
  `,
})
export class ChatwootHomeComponent implements OnDestroy {
  conversations = signal<any[]>([]);
  messages = signal<any[]>([]);
  loading = signal<boolean>(true);
  selectedId = signal<number | null>(null);
  draft = '';

  private pollHandle: any;

  constructor(private apollo: Apollo) {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.apollo.query({ query: Q_CONVS, variables: { limit: 25 }, fetchPolicy: 'network-only' })
      .subscribe((res: any) => {
        this.conversations.set(res.data.chatwootConversations ?? []);
        this.loading.set(false);
      });
    if (this.selectedId()) this.loadMessages(this.selectedId()!);
  }

  select(c: any) {
    if (!c) return;
    this.selectedId.set(Number(c.id));
    this.loadMessages(Number(c.id));
    this.startPolling();
  }

  loadMessages(id: number) {
    this.apollo.query({ query: Q_MSGS, variables: { id, limit: 50 }, fetchPolicy: 'network-only' })
      .subscribe((res: any) => this.messages.set(res.data.chatwootMessages ?? []));
  }

  send(ev: Event) {
    ev.preventDefault();
    if (!this.draft || !this.selectedId()) return;
    const content = this.draft;
    this.draft = '';
    const optimistic = { id: 'temp-' + Date.now(), content, message_type: 'outgoing' };
    this.messages.set([...this.messages(), optimistic]);
  this.apollo.mutate({ mutation: M_SEND, variables: { id: this.selectedId(), content } })
      .subscribe({
        next: (res: any) => {
          // Replace optimistic with real message if returned
          this.loadMessages(this.selectedId()!);
        },
        error: () => {
          // Rollback optimistic on failure
          this.messages.set(this.messages().filter(m => m !== optimistic));
        }
      });
  }

  newConversation() {
    const sourceId = 'demo-' + Date.now();
    this.apollo.mutate({ mutation: gql`mutation($input: ChatwootNewConversationInput!){ createChatwootConversation(input:$input){ id inbox_id } }`, variables: { input: { sourceId, initialMessage: 'New conversation started' } } })
      .subscribe((res: any) => {
        const created = res.data?.createChatwootConversation;
        if (created) {
          this.conversations.set([created, ...this.conversations()]);
          this.select(created);
        }
      });
  }

  private startPolling() {
    if (this.pollHandle) clearInterval(this.pollHandle);
    if (!this.selectedId()) return;
    this.pollHandle = setInterval(() => {
      if (this.selectedId()) this.loadMessages(this.selectedId()!);
    }, 5000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }
}
