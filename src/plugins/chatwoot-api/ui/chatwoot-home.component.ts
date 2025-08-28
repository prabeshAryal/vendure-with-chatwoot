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
        <li *ngFor="let c of conversations()" (click)="select(c)" [style.background]= "c.id===selectedId()? '#e3f2fd':'transparent'" style="padding:10px 8px; cursor:pointer; border-bottom:1px solid #e0e0e0; border-radius:6px; margin-bottom:2px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:bold; color:#1976d2;">#{{c.id}}</span>
            <span *ngIf="c.status==='resolved'" style="background:#c8e6c9; color:#388e3c; font-size:11px; padding:2px 8px; border-radius:8px;">Resolved</span>
            <span *ngIf="c.status!=='resolved'" style="background:#fff9c4; color:#fbc02d; font-size:11px; padding:2px 8px; border-radius:8px;">Open</span>
            <button *ngIf="c.status!=='resolved'" (click)="$event.stopPropagation(); resolve(c)" style="margin-left:auto; background:#388e3c; color:#fff; border:none; border-radius:6px; font-size:11px; padding:2px 10px; cursor:pointer;">Resolve</button>
          </div>
          <div style="font-size:13px; color:#444; margin-top:2px;" *ngIf="c.last_message_content">{{c.last_message_content | slice:0:40}}...</div>
          <div style="font-size:10px; color:#888; margin-top:2px;" *ngIf="c.updated_at">{{c.updated_at | date:'short'}}</div>
        </li>
      </ul>
    </div>
    <div style="flex:1; display:flex; flex-direction:column;">
  <div style="flex:1; overflow:auto; padding:16px; background:#f5f7fa; border-radius:8px;">
        <div *ngIf="!selectedId()" style="color:#666;">Select or create a conversation.</div>
        <div *ngFor="let m of messages()" style="margin:8px 0; display:flex;">
          <div [style.background]="m.isAdmin ? '#e3fcec':'#fff'" [style.borderColor]="m.isAdmin ? '#43a047':'#bdbdbd'" style="padding:10px 14px; border:1px solid; border-radius:10px; max-width:70%; white-space:pre-wrap; box-shadow:0 2px 8px -2px #1976d255;">
            <small style="display:block; font-size:11px; color:#1976d2; margin-bottom:2px; font-weight:600;">{{ m.isAdmin ? 'Support' : 'Visitor' }}</small>
            {{ m.content }}
          </div>
        </div>
      </div>
      <form (submit)="send($event)" style="display:flex; gap:8px; border-top:1px solid #e0e0e0; padding:12px 0; background:#f5f7fa; border-radius:0 0 8px 8px;">
        <input type="text" [(ngModel)]="draft" name="draft" placeholder="Type message..." style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid #bdbdbd; font-size:15px;" [disabled]="!selectedId()">
        <button type="submit" [disabled]="!draft || !selectedId()" style="background:#1976d2; color:#fff; border:none; border-radius:8px; padding:0 24px; font-size:15px; font-weight:600; cursor:pointer;">Send</button>
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
    this.apollo.query({ query: Q_CONVS, variables: { limit: 1000 }, fetchPolicy: 'network-only' })
      .subscribe((res: any) => {
        this.conversations.set(res.data.chatwootConversations ?? []);
        this.loading.set(false);
      });
    if (this.selectedId()) this.loadMessages(this.selectedId()!);
  }

  resolve(conv: any) {
    if (!conv?.id) return;
    this.apollo.mutate({ mutation: gql`mutation($id:ID!){ resolveChatwootConversation(conversationId:$id) }`, variables: { id: conv.id } })
      .subscribe(() => this.reload());
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
