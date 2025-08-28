import { Component, signal, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

const Q_CONVS = gql`
    query($limit:Int) {
        chatwootConversations(limit:$limit) {
            id
            inbox_id
            contact_id
            last_message_content
            updated_at
            status
        }
    }
`;

const Q_MSGS = gql`
    query($id:ID!, $limit:Int) {
        chatwootMessages(conversationId:$id, limit:$limit) {
            messages {
                id
                content
                created_at
                message_type
                direction
                sender_name
                sender_avatar
                isAdmin
            }
        }
    }
`;

const M_SEND = gql`
    mutation($id:ID!, $content:String!) {
        sendChatwootMessage(conversationId:$id, content:$content) {
            id
        }
    }
`;

const M_TOGGLE_STATUS = gql`
    mutation($id:ID!) {
        toggleChatwootConversationStatus(conversationId:$id)
    }
`;

@Component({
  selector: 'vdr-chatwoot-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <style>
      .container {
        display: flex;
        height: calc(100vh - 140px);
        border: 1px solid #ccc;
        border-radius: 8px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .sidebar {
        width: 320px;
        border-right: 1px solid #ccc;
        overflow-y: auto;
        background: #f9fafb;
      }
      .sidebar-header {
        padding: 12px;
        border-bottom: 1px solid #ccc;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #fff;
      }
      .chat-header {
        padding: 12px 16px;
        border-bottom: 1px solid #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9fafb;
      }
      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .message-form {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #ccc;
        background: #f9fafb;
      }
      .conversation-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .conversation-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #e0e0e0;
        transition: background 0.2s;
      }
      .conversation-item:hover {
        background: #f0f0f0;
      }
      .conversation-item.selected {
        background: #e3f2fd;
      }
      .conversation-item .id {
        font-weight: bold;
        color: #1976d2;
        margin-right: 8px;
      }
      .conversation-item .preview {
        font-size: 13px;
        color: #555;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
      .conversation-item .date {
        font-size: 11px;
        color: #888;
        margin-top: 4px;
      }
      .status-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
        text-transform: capitalize;
      }
      .status-resolved {
        background: #c8e6c9;
        color: #2e7d32;
      }
      .status-open {
        background: #fff9c4;
        color: #f57f17;
      }
      .status-pending {
        background: #ffccbc;
        color: #c85a3e;
      }
      .message-bubble-row {
        display: flex;
        margin-bottom: 12px;
      }
      .message-bubble-row.outgoing {
        justify-content: flex-end;
      }
      .message-bubble {
        padding: 10px 14px;
        border-radius: 18px;
        max-width: 75%;
        line-height: 1.4;
      }
      .message-bubble.incoming {
        background: #f1f3f5;
        border-bottom-left-radius: 4px;
      }
      .message-bubble.outgoing {
        background: #1976d2;
        color: white;
        border-bottom-right-radius: 4px;
      }
      .message-info {
        font-size: 11px;
        color: #777;
        margin: 4px 0;
      }
      .message-bubble-row.incoming .message-info {
        margin-left: 4px;
      }
      .message-bubble-row.outgoing .message-info {
        text-align: right;
        margin-right: 4px;
      }
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }
      .btn-primary {
        background: #1976d2;
        color: white;
      }
      .btn-primary:disabled {
        background: #a0a0a0;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #e0e0e0;
        color: #333;
      }
      .btn-success {
        background: #2e7d32;
        color: white;
      }
      .btn-danger {
        background: #d32f2f;
        color: white;
      }
      .text-input {
        flex: 1;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #bdbdbd;
        font-size: 15px;
      }
      .text-input:focus {
        outline: none;
        border-color: #1976d2;
        box-shadow: 0 0 0 2px #1976d230;
      }
      .reopen-btn {
        margin-top: 8px;
        padding: 4px 8px;
      }
    </style>
    <div class="container">
      <div class="sidebar">
        <div class="sidebar-header">
          <button class="btn btn-secondary" (click)="reload()">↻ Refresh</button>
        </div>
        <div *ngIf="loading()" style="padding:16px;">Loading conversations...</div>
        <ul class="conversation-list">
          <li *ngFor="let c of conversations()" (click)="select(c)" class="conversation-item" [class.selected]="c.id === selectedId()">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="id">#{{c.id}}</span>
              <span class="status-badge" [ngClass]="'status-' + c.status.trim()">
                {{ c.status }}
              </span>
            </div>
            <div class="preview" title="{{c.last_message_content}}">{{c.last_message_content || 'No messages yet.'}}</div>
            <div class="date" *ngIf="c.updated_at">{{c.updated_at | date:'short'}}</div>
            <button *ngIf="c.status.trim() === 'resolved'" class="btn btn-danger reopen-btn" (click)="toggleStatus(c.id); $event.stopPropagation()">
              Reopen
            </button>
          </li>
        </ul>
      </div>
      <div class="chat-area">
        <ng-container *ngIf="selectedId(); else noSelection">
          <div class="chat-header">
            <h3 style="margin:0;">Conversation #{{selectedId()}}</h3>
          </div>
          <div class="messages-container" #messagesContainer>
            <div *ngFor="let m of messages()" class="message-bubble-row" [class.outgoing]="!m.isSystem && m.isAdmin" [class.incoming]="!m.isAdmin && !m.isSystem">
              <div>
                <div class="message-bubble" 
                     [class.outgoing]="!m.isSystem && m.isAdmin" 
                     [class.incoming]="!m.isSystem && !m.isAdmin" 
                     [style.background]="m.isSystem ? '#ececec' : null" 
                     [style.color]="m.isSystem ? '#444' : null">
                  <ng-container *ngIf="!m.isSystem; else systemTpl">{{ m.content }}</ng-container>
                  <ng-template #systemTpl>
                    <em>{{ m.content }}</em>
                  </ng-template>
                </div>
                <div class="message-info">
                  <strong>{{ m.isSystem ? 'System' : (m.sender_name || (m.isAdmin ? 'Agent' : 'Visitor')) }}</strong>
                  <span *ngIf="m.created_at"> &middot; {{ m.created_at | date:'shortTime' }}</span>
                </div>
              </div>
            </div>
          </div>
          <form (submit)="send($event)" class="message-form">
            <input type="text" [(ngModel)]="draft" name="draft" placeholder="Type your message..." class="text-input" [disabled]="!selectedId()">
            <button type="submit" class="btn btn-primary" [disabled]="!draft || !selectedId()">Send</button>
          </form>
        </ng-container>
        <ng-template #noSelection>
          <div style="flex:1; display:flex; align-items:center; justify-content:center; color:#888;">
            <p>Select a conversation from the list to view messages.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
})
export class ChatwootHomeComponent implements OnDestroy, AfterViewChecked {
  conversations = signal<any[]>([]);
  messages = signal<any[]>([]);
  loading = signal<boolean>(true);
  selectedId = signal<number | null>(null);
  draft = '';

  private pollHandle: any;
  private shouldScrollToBottom = false;

  @ViewChild('messagesContainer') private messagesContainer: ElementRef | undefined;

  constructor(private apollo: Apollo) {
    this.reload();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  reload() {
    this.loading.set(true);
    this.apollo.query({ query: Q_CONVS, variables: { limit: 1000 }, fetchPolicy: 'network-only' })
      .subscribe((res: any) => {
        this.conversations.set(res.data.chatwootConversations ?? []);
        this.loading.set(false);
      });
    if (this.selectedId()) {
      this.loadMessages(this.selectedId()!);
    }
  }

  toggleStatus(conversationId: number | null) {
    if (!conversationId) return;
    this.apollo.mutate({ mutation: M_TOGGLE_STATUS, variables: { id: conversationId }, fetchPolicy: 'no-cache' })
      .subscribe({
        next: () => this.reload(),
        error: () => this.reload(),
      });
  }

  select(c: any) {
    if (!c) return;
    this.selectedId.set(Number(c.id));
    this.loadMessages(Number(c.id));
    this.startPolling();
  }

  loadMessages(id: number) {
    this.apollo.query({ query: Q_MSGS, variables: { id, limit: 100 }, fetchPolicy: 'network-only' })
      .subscribe((res: any) => {
        this.messages.set(res.data.chatwootMessages?.messages ?? []);
        this.shouldScrollToBottom = true;
      });
  }

  send(ev: Event) {
    ev.preventDefault();
    if (!this.draft || !this.selectedId()) return;
    const content = this.draft;
    this.draft = '';
    const optimistic = {
      id: 'temp-' + Date.now(),
      content,
      isAdmin: true,
      created_at: new Date().toISOString(),
      sender_name: 'Agent'
    };
    this.messages.set([...this.messages(), optimistic]);
    this.shouldScrollToBottom = true;

    this.apollo.mutate({ mutation: M_SEND, variables: { id: this.selectedId(), content } })
      .subscribe({
        next: () => {
          // Message sent, will be replaced by polled message
        },
        error: () => {
          // Rollback optimistic on failure
          this.messages.set(this.messages().filter(m => m.id !== optimistic.id));
        }
      });
  }

  private startPolling() {
    if (this.pollHandle) clearInterval(this.pollHandle);
    if (!this.selectedId()) return;
    this.pollHandle = setInterval(() => {
      if (this.selectedId()) {
        this.loadMessages(this.selectedId()!);
      }
    }, 5000);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTo({
          top: this.messagesContainer.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch (err) { }
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }
}
