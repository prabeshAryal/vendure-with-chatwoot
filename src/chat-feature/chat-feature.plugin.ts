import { PluginCommonModule, Type, VendurePlugin, Logger } from '@vendure/core';
import { ChatwootApiPlugin } from '../plugins/chatwoot-api/chatwoot-api.plugin';
import { ChatwootService } from '../plugins/chatwoot-api/chatwoot.service';

import { CHAT_FEATURE_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

// Track usage metrics (lightweight)
let chatUiServeCount = 0;

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: CHAT_FEATURE_PLUGIN_OPTIONS, useFactory: () => ChatFeaturePlugin.options }],
    configuration: config => {
        // Mount public chat UI & lightweight REST endpoints under /chat & /chat/api
        config.apiOptions.middleware = config.apiOptions.middleware || [];

        // Serve new minimalist single-conversation Chat UI (ChatGPT style)
        config.apiOptions.middleware = [
            {
                route: '/chat',
                handler: (req: any, res: any, next: any) => {
                    // Avoid intercepting API/health requests under /chat/* which must return JSON
                    const original = req.originalUrl || req.url || '';
                    if (original.startsWith('/chat/api') || original === '/chat/health' || original === '/chat/status') {
                        return next();
                    }
                    const html = `<!doctype html><html><head><meta charset=utf-8><title>Chat Support</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root { --brand-color: #3b82f6; --bg-main: #f3f4f6; --bg-secondary: #ffffff; --text-primary: #111827; --text-secondary: #6b7280; --border-color: #e5e7eb; --agent-bubble: #e5e7eb; --user-bubble: var(--brand-color); --user-bubble-text: #ffffff; }
html.dark { --bg-main: #111827; --bg-secondary: #1f2937; --text-primary: #f9fafb; --text-secondary: #9ca3af; --border-color: #374151; --agent-bubble: #374151; }
*{box-sizing:border-box; margin:0; padding:0;}
body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg-main);color:var(--text-primary);display:flex;flex-direction:column;min-height:100vh;-webkit-font-smoothing:antialiased; transition: background-color 0.3s, color 0.3s;}
#app-container{display:flex;flex-direction:column;max-width:800px;width:100%;margin:0 auto;height:100vh;box-shadow:0 0 40px rgba(0,0,0,0.05);}
header{display:flex;align-items:center;gap:12px;padding:16px 20px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);box-shadow:0 1px 3px rgba(0,0,0,0.05);}
header .avatar{width:40px;height:40px;border-radius:50%;background:var(--brand-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;}
header .info h1{font-size:16px;font-weight:600;}
header .info .sub{font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;margin-top:2px;}
header .info .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e99;}
#chat{flex:1;display:flex;flex-direction:column;padding:20px;overflow-y:auto;scroll-behavior:smooth;}
.msg{display:flex;gap:12px;margin-bottom:16px;max-width:85%;}
.msg.user{align-self:flex-end;flex-direction:row-reverse;}
.msg .avatar{width:32px;height:32px;border-radius:50%;background:#9ca3af;color:white;display:flex;align-items:center;justify-content:center;font-weight:500;font-size:14px;flex-shrink:0;align-self:flex-end;}
.msg.user .avatar{background:var(--brand-color);}
.msg-content{display:flex;flex-direction:column;}
.bubble{padding:12px 16px;border-radius:18px;line-height:1.6;font-size:14px;white-space:pre-wrap;word-wrap:break-word;box-shadow:0 2px 4px rgba(0,0,0,0.05);}
.msg.agent .bubble{background:var(--agent-bubble);color:var(--text-primary);border-bottom-left-radius:4px;}
.msg.user .bubble{background:var(--user-bubble);color:var(--user-bubble-text);border-bottom-right-radius:4px;}
.meta{font-size:11px;color:var(--text-secondary);margin-top:6px;padding:0 4px;}
.msg.user .meta{text-align:right;}
footer{background:var(--bg-secondary);border-top:1px solid var(--border-color);padding:16px 20px;}
form{display:flex;gap:12px;align-items:flex-end;}
textarea{flex:1;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:18px;padding:12px 20px;resize:none;min-height:48px;max-height:200px;font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;outline:none;box-shadow:0 0 0 2px transparent, 0 1px 2px rgba(0,0,0,0.05);transition:all .2s ease-in-out;}
textarea:focus{border-color:var(--brand-color);box-shadow:0 0 0 4px #3b82f633, 0 1px 2px rgba(0,0,0,0.05);}
button{background:var(--brand-color);color:#fff;border:none;font-weight:600;width:52px;height:52px;border-radius:50%;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .2s ease-in-out;box-shadow:0 4px 14px -2px #3b82f666;transform:scale(1);}
button:disabled{opacity:.4;cursor:not-allowed;box-shadow:none;transform:scale(0.95);}
button:not(:disabled):hover{background:#2563eb;transform:scale(1.05);}
button:not(:disabled):active{transform:scale(0.98);}
.typing-indicator{display:flex;gap:4px;align-items:center;padding:12px 16px;}
.typing-indicator span{width:8px;height:8px;background-color:var(--text-secondary);border-radius:50%;animation:pulse 1.4s infinite ease-in-out both;}
.typing-indicator span:nth-child(1){animation-delay:-.32s;}
.typing-indicator span:nth-child(2){animation-delay:-.16s;}
@keyframes pulse{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}
</style></head><body>
<div id="app-container">
    <header>
        <div class="avatar">S</div>
        <div class="info">
            <h1>Support Chat</h1>
            <div class="sub" id="sub"><div class="dot"></div><span id="status-text">Connecting...</span></div>
        </div>
    </header>
    <main id="chat"></main>
    <footer>
        <form id="chatForm">
            <textarea id="input" placeholder="Type your message..." autocomplete="off"></textarea>
            <button id="sendBtn" type="submit" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </form>
    </footer>
</div>
<script>
const el = sel => document.querySelector(sel);
const chat = el('#chat');
const input = el('#input');
const sendBtn = el('#sendBtn');
const statusText = el('#status-text');
let contactSource = localStorage.getItem('cw_contact_source');
let conversationId = localStorage.getItem('cw_conversation_id');
let loading = false; let polling = null; const lastMessageIds = new Set();

// Function to smoothly scroll to the bottom of the chat
function scrollToBottom() {
    // Using setTimeout ensures the DOM has updated before we try to scroll
    setTimeout(() => {
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }, 100);
}

function append(role, content, timestamp, opts={}) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? 'Y' : 'S';

    const msgContent = document.createElement('div');
    msgContent.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = escapeHtml(content);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    msgContent.appendChild(bubble);
    msgContent.appendChild(meta);
    wrap.appendChild(avatar);
    wrap.appendChild(msgContent);
    
    chat.appendChild(wrap);
    
    if(opts.replace){ opts.replace.replaceWith(wrap); }
    
    // Always scroll to bottom when a new message is appended
    scrollToBottom();
}

function escapeHtml(str) { return (str||'').replace(/[&<>]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
function setStatus(t) { statusText.textContent = t; }
async function api(path, opt) {
    const r = await fetch(path,{ headers:{'Content-Type':'application/json'}, ...opt});
    const raw = await r.text();
    if(!r.ok){ throw new Error(raw.slice(0,200)); }
    try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON response'); }
}
async function start() { 
    setStatus('Starting session...'); 
    const body = { contactSource, conversationId, name: 'Visitor '+(contactSource?contactSource.slice(-4):'') }; 
    const data = await api('/chat/api/start',{ method:'POST', body: JSON.stringify(body)}); 
    contactSource = data.contactSource; 
    conversationId = data.conversationId; 
    localStorage.setItem('cw_contact_source', contactSource); 
    localStorage.setItem('cw_conversation_id', conversationId); 
    setStatus('Connected'); 
    loadMessages(); 
    if(!polling){ polling=setInterval(loadMessages, 4000); } 
}
async function loadMessages() {
    if(!conversationId) return;
    try {
        const list = await api('/chat/api/messages?contact='+encodeURIComponent(contactSource)+'&conversation='+conversationId);
        list.sort((a,b)=>(a.created_at||0)-(b.created_at||0));
        
        let messagesChanged = false;
        if (list.length !== lastMessageIds.size) {
            chat.innerHTML = '';
            lastMessageIds.clear();
            messagesChanged = true;
        }

        for(const m of list) {
            if (!lastMessageIds.has(m.id)) {
                const role = m.side === 'visitor' ? 'user' : 'agent';
                append(role, m.content||'', m.created_at_ms || m.created_at * 1000);
                lastMessageIds.add(m.id);
                messagesChanged = true;
            }
        }
        
        // If messages were re-rendered or new ones added, scroll down
        if (messagesChanged) {
            scrollToBottom();
        }
    } catch(e){ console.warn('msg load', e.message); }
}
async function sendMessage(text) {
    if(!text.trim()) return;
    if(!contactSource || !conversationId){
        try { await start(); } catch(e){ append('agent','(Session error) '+e.message, new Date().getTime()); return; }
    }
    input.value=''; 
    sendBtn.disabled=true;
    autoResize();

    try {
        await api('/chat/api/messages',{ method:'POST', body: JSON.stringify({ contact: contactSource, conversation: conversationId, content: text })});
        // Let polling handle showing the new message to ensure order
        await loadMessages();
    } catch(e){ 
        append('agent','(Failed to send) '+e.message, new Date().getTime()); 
    }
}
function autoResize() { 
    input.style.height='auto'; 
    const h = Math.min(input.scrollHeight, 200); 
    input.style.height = h+'px'; 
}
input.addEventListener('input',()=>{ 
    sendBtn.disabled = !input.value.trim(); 
    autoResize(); 
});
input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
});
document.getElementById('chatForm').addEventListener('submit', async e=>{ 
    e.preventDefault(); 
    if(sendBtn.disabled) return; 
    await sendMessage(input.value); 
});
start();
// Rapid initial polling (first ~7.5s) to surface early agent replies quickly
let rapid=5; const rapidTimer=setInterval(()=>{ if(rapid--<=0){ clearInterval(rapidTimer); return;} loadMessages(); },1500);
</script></body></html>`;
                    chatUiServeCount++;
                    if (chatUiServeCount === 1) {
                        Logger.info('Public Chat UI served at /chat');
                    } else if (chatUiServeCount % 100 === 0) {
                        Logger.debug(`Chat UI served ${chatUiServeCount} times`);
                    }
                    res.type('html').send(html);
                }
            },
            {
                route: '/admin/chat',
                handler: (_req: any, res: any) => res.redirect(301, '/chat')
            },
            ...config.apiOptions.middleware || []
        ];

    // JSON body parser for /chat/api
    config.apiOptions.middleware.push({ route: '/chat/api', handler: require('express').json() });
    // Admin JSON parser
    config.apiOptions.middleware.push({ route: '/admin/chatwoot/api', handler: require('express').json() });

        // Health endpoint
        config.apiOptions.middleware.push({
            route: '/chat/health',
            handler: (_req: any, res: any) => {
                res.json({ status: 'ok', served: chatUiServeCount });
            }
        });

    // Public Chat endpoints (internal API backed) replacing failing public API usage
    // Use primary token for public chat to attribute messages correctly as visitor
    const publicChatOptions = { ...ChatwootApiPlugin.options, apiToken: ChatwootApiPlugin.options.agentApiToken || ChatwootApiPlugin.options.apiToken };
    const chatwootService = new ChatwootService(publicChatOptions);
    config.apiOptions.middleware.push({
        route: '/chat/api',
        handler: async (req: any, res: any, next: any) => {
            const full = req.originalUrl || req.url || '';
            const rel = (req.path || '').replace(/^\/chat\/api/, '') || '';
            const ends = (suffix: string) => full.endsWith(suffix) || rel === suffix || rel === '/' + suffix;
            const logPrefix = '[PublicChatInternal]';
            try {
                // Start / resume session
                if (req.method === 'POST' && ends('/start')) {
                    const { contactSource, conversationId, name } = req.body || {};
                    const baseOk = !!ChatwootApiPlugin.options.baseUrl && !!ChatwootApiPlugin.options.accountId && !!ChatwootApiPlugin.options.inboxId;
                    if (!baseOk) {
                        return res.status(500).json({ error: 'chat_config_incomplete', details: {
                            baseUrl: ChatwootApiPlugin.options.baseUrl || null,
                            accountId: ChatwootApiPlugin.options.accountId,
                            inboxId: ChatwootApiPlugin.options.inboxId
                        }});
                    }
                    let source = contactSource || `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(-6)}`;
                    let convId = conversationId;
                    // Reuse existing conversation for the same sourceId if possible
                    if (!convId) {
                        try {
                            const existing = await chatwootService.findConversationBySourceId(source);
                            if (existing?.id) {
                                convId = existing.id;
                                // If existing conversation is resolved, start a fresh one for new session continuity
                                if ((existing as any).status === 'resolved' || (existing as any).resolved) {
                                    convId = undefined;
                                }
                            }
                        } catch {}
                    }
                    if (!convId) {
                        try {
                            const conv = await chatwootService.createConversation({
                                sourceId: source,
                                name: name || 'Visitor',
                                email: undefined,
                            });
                            convId = conv?.id;
                        } catch (e: any) {
                            Logger.error(`${logPrefix} createConversation failed ${e.message}`);
                            return res.status(500).json({ error: 'conversation_create_failed', message: e.message });
                        }
                    }
                    if (!convId) return res.status(500).json({ error: 'conversation_unresolved' });
                    return res.json({ contactSource: source, conversationId: convId });
                }
                // List messages (fresh, include both sides)
                if (req.method === 'GET' && ends('/messages')) {
                    const { conversation } = req.query || {};
                    if (!conversation) return res.status(400).json({ error: 'missing_conversation' });
                    const cid = Number(conversation);
                    if (Number.isNaN(cid)) return res.status(400).json({ error: 'invalid_conversation' });
                    try {
                        // Only use live API messages, no cache
                        const msgs: any[] = await chatwootService.listMessagesFresh(cid, 120);
                        // Logger.info('[ChatFeaturePlugin] Raw service output from listMessagesFresh (API only): ' + JSON.stringify(msgs));
                        const mapped = msgs.map((m: any) => ({
                            id: m.id,
                            content: m.content,
                            message_type: m.message_type === 1 ? 'incoming' : (m.message_type === 0 ? 'outgoing' : m.message_type),
                            created_at: m.created_at,
                            created_at_ms: m.created_at_ms,
                            direction: (m.message_type === 1 || m.message_type === 'incoming') ? 'incoming' : 'outgoing',
                            side: (m.message_type === 1 || m.message_type === 'incoming') ? 'visitor' : 'agent',
                            sender_name: (m.message_type === 1 || m.message_type === 'incoming') ? 'You' : 'Agent'
                        }));
                        // Logger.info('[ChatFeaturePlugin] Mapped array for /chat/api/messages (API only): ' + JSON.stringify(mapped));
                        mapped.sort((a: any, b: any) => (a.created_at_ms || a.created_at || 0) - (b.created_at_ms || b.created_at || 0));
                        // Logger.info('[ChatFeaturePlugin] Final sorted response for /chat/api/messages (API only): ' + JSON.stringify(mapped));
                        return res.json(mapped);
                    } catch (e: any) {
                        Logger.error(`${logPrefix} listMessages failed ${e.message}`);
                        return res.status(500).json({ error: 'messages_list_failed', message: e.message });
                    }
                }
        // Send message: treat as visitor (incoming) using account token; fallback will mark as outgoing with public_user if needed
        if (req.method === 'POST' && ends('/messages')) {
                    const { conversation, content } = req.body || {};
                    if (!conversation || !content) return res.status(400).json({ error: 'missing_fields' });
                    const cid = Number(conversation);
                    if (Number.isNaN(cid)) return res.status(400).json({ error: 'invalid_conversation' });
                    try {
                        // Use a fresh service with the primary (account) token to attempt incoming visitor message
                        const publicChatOptions = { ...ChatwootApiPlugin.options, apiToken: ChatwootApiPlugin.options.agentApiToken || ChatwootApiPlugin.options.apiToken };
                        const visitorService = new ChatwootService(publicChatOptions);
                        // Explicitly set message_type to 'incoming' for visitor messages
                        const msg = await visitorService.sendPublicMessage(cid, content);
                        return res.json({
                            id: msg.id,
                            content: msg.content,
                            message_type: 'incoming',
                            direction: 'incoming',
                            side: 'visitor',
                            sender_name: 'You',
                            created_at: msg.created_at,
                            created_at_ms: msg.created_at_ms
                        });
                    } catch (e: any) {
                        Logger.error(`${logPrefix} sendPublicMessage failed ${e.message}`);
                        return res.status(500).json({ error: 'send_failed', message: e.message });
                    }
                }
                // Resolve conversation (toggle status internally)
                if (req.method === 'POST' && ends('/resolve')) {
                    const { conversation } = req.body || {};
                    if (!conversation) return res.status(400).json({ error: 'missing_conversation' });
                    const cid = Number(conversation);
                    if (Number.isNaN(cid)) return res.status(400).json({ error: 'invalid_conversation' });
                    try {
                        // Direct fetch; no helper yet
                        const fetchImpl: any = (global as any).fetch || ((): any => { try { const nf = require('node-fetch'); return nf.default || nf; } catch { return undefined; } })();
                        if (!fetchImpl) throw new Error('fetch_unavailable');
                        const url = `${ChatwootApiPlugin.options.baseUrl}/api/v1/accounts/${ChatwootApiPlugin.options.accountId}/conversations/${cid}/toggle_status`;
                        const r = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api_access_token': ChatwootApiPlugin.options.apiToken } });
                        const raw = await r.text();
                        if (!r.ok) return res.status(r.status).json({ error: 'resolve_failed', status: r.status, body: raw.slice(0,200) });
                        return res.json({ resolved: true, conversation: cid });
                    } catch (e: any) {
                        Logger.error(`${logPrefix} resolve failed ${e.message}`);
                        return res.status(500).json({ error: 'resolve_failed', message: e.message });
                    }
                }
                next();
            } catch (e: any) {
                Logger.error(`${logPrefix} handler error ${e.message}`);
                res.status(500).json({ error: e.message });
            }
        }
    });

        // Health / diagnostic endpoint
        config.apiOptions.middleware.push({
            route: '/chat/api',
            handler: (req: any, res: any, next: any) => {
                if (req.method === 'GET' && (req.path === '/health' || req.path === '/status')) {
                    return res.json({
                        ok: true,
                        inboxIdSet: !!process.env.CHATWOOT_INBOX_ID,
                        baseUrl: ChatwootApiPlugin.options.baseUrl || null,
                        served: chatUiServeCount,
                    });
                }
                next();
            }
        });

        // Admin Chat UI (agent view) at /admin/chatwoot
        config.apiOptions.middleware.push({
            route: '/admin/chatwoot',
            handler: async (req: any, res: any, next: any) => {
                if (req.path !== '/admin/chatwoot') return next();
                const html = `<!doctype html><html><head><meta charset=utf-8><title>Agent Chatwoot Console</title><meta name=viewport content=\"width=device-width,initial-scale=1\" />
<style>body{margin:0;font-family:system-ui,Arial,sans-serif;background:#0b0e11;color:#dde4ee;display:flex;flex-direction:column;height:100vh;}header{padding:10px 16px;background:#141a22;border-bottom:1px solid #1f2730;font-size:14px;font-weight:600;letter-spacing:.5px;display:flex;align-items:center;gap:12px;}header button.resolve{background:#334155;color:#fff;border:1px solid #475569;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;}header button.resolve:disabled{opacity:.4;cursor:not-allowed;}main{flex:1;display:flex;min-height:0;}aside{width:270px;border-right:1px solid #1f2730;display:flex;flex-direction:column;}aside h2{margin:0;padding:10px 14px;font-size:12px;letter-spacing:1px;opacity:.6;}#convs{flex:1;overflow:auto;}#convs button{all:unset;display:block;width:100%;padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #1a222c;text-align:left;}#convs button.active{background:#1d2732;}#convs button .metaLine{display:block;font-size:11px;opacity:.55;margin-top:2px;}#messages{flex:1;display:flex;flex-direction:column;overflow:auto;padding:14px;gap:10px;} .bubble{max-width:60%;padding:10px 12px;border-radius:12px;line-height:1.4;font-size:13px;background:#1d2732;box-shadow:0 1px 2px #0006;} .out{align-self:flex-end;background:#2563eb;color:#fff;} footer{border-top:1px solid #1f2730;padding:10px;background:#141a22;display:flex;gap:8px;}footer input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid #2c3947;background:#1a222c;color:#fff;}footer button{background:#2563eb;border:none;color:#fff;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;}footer button:disabled{opacity:.4;cursor:not-allowed;} .meta{font-size:11px;opacity:.55;text-align:center;padding:4px 0;} .idtag{opacity:.5;font-size:10px;margin-top:2px;} .err{color:#f87171;font-size:12px;padding:4px 8px;background:#2d1a1a;border:1px solid #f87171;margin:6px 10px;border-radius:6px;}
</style></head><body><header>Agent Chatwoot Console <button class=resolve id=resolveBtn disabled>Resolve</button></header><main><aside><h2>CONVERSATIONS</h2><div id="convErr" class="err" style="display:none"></div><div id="convs"></div></aside><section style="flex:1;display:flex;flex-direction:column;min-width:0;"><div id="messages"></div><div class="meta" id="status">Idle</div><footer><input id="msgInput" placeholder="Type reply..."" autocomplete="off"/><button id="sendBtn" disabled>Send</button></footer></section></main><script>
const el=id=>document.getElementById(id);const convsEl=el('convs');const msgsEl=el('messages');const statusEl=el('status');const input=el('msgInput');const sendBtn=el('sendBtn');const resolveBtn=el('resolveBtn');const convErr=el('convErr');let current=null;async function fetchJson(u,opt){const r=await fetch(u,opt);const t=await r.text();if(!r.ok) throw new Error(t.slice(0,200));try{return JSON.parse(t);}catch{return t;} }
async function loadConvs(){status('Loading conversations...');try{const list=await fetchJson('/admin/chatwoot/api/conversations');renderConvs(list);}catch(e){convErr.style.display='block';convErr.textContent='Conversations error: '+e.message;} }
function renderConvs(list){convsEl.innerHTML='';list.forEach(c=>{const b=document.createElement('button');b.innerHTML='<strong>#'+c.id+'</strong>'+(c.last_message_content?' <span class=metaLine>'+escapeHtml(c.last_message_content.slice(0,60))+'</span>':'');if(c.id===current) b.classList.add('active');b.onclick=()=>{selectConv(c.id)};convsEl.appendChild(b);}); if(current && !list.find(c=>c.id===current)){current=null;msgsEl.innerHTML='';} resolveBtn.disabled=!current;}
async function selectConv(id){current=id;updateButtons();await loadMessages();renderConvs(await fetchJson('/admin/chatwoot/api/conversations'));}
async function loadMessages(){if(!current) return;status('Loading messages...');msgsEl.innerHTML='';try{const list=await fetchJson('/admin/chatwoot/api/conversations/'+current+'/messages');list.forEach(m=>appendMsg(m));status('Conversation #'+current);}catch(e){appendSystem('(Failed to load messages) '+e.message);} }
function appendMsg(m){const wrap=document.createElement('div');const outgoing=(m.message_type==='outgoing')||(m.direction==='outgoing');
// FIX: Changed role names for clarity in the agent UI. 'You (Agent)' now refers to the agent, and 'Visitor' to the customer.
const roleName=outgoing?'You (Agent)':'Visitor';
wrap.className='bubble '+(outgoing?'out':'in');wrap.innerHTML='<strong>'+roleName+'</strong><div>'+escapeHtml(m.content||'')+'</div><div class="idtag">'+m.id+'</div>';msgsEl.appendChild(wrap);msgsEl.scrollTop=msgsEl.scrollHeight;}
function appendSystem(t){const w=document.createElement('div');w.className='bubble';w.style.opacity=.6;w.textContent=t;msgsEl.appendChild(w);}
function escapeHtml(s){return (s||'').replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));}
function status(t){statusEl.textContent=t;}
function send(){if(!current||!input.value.trim()) return;const text=input.value.trim();input.value='';updateButtons();appendMsg({content:text,message_type:'outgoing',id:'temp-'+Date.now(),direction:'outgoing'});fetchJson('/admin/chatwoot/api/conversations/'+current+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text})}).then(()=>loadMessages()).catch(e=>appendSystem('(Send failed) '+e.message));}
function updateButtons(){sendBtn.disabled=!input.value.trim()||!current;resolveBtn.disabled=!current;}
input.addEventListener('input',updateButtons);sendBtn.onclick=()=>send();resolveBtn.onclick=()=>{if(!current) return;resolveBtn.disabled=true;fetchJson('/chat/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversation:current})}).then(()=>{status('Resolved conversation #'+current);current=null;msgsEl.innerHTML='';loadConvs();}).catch(e=>{appendSystem('(Resolve failed) '+e.message);resolveBtn.disabled=false;});};loadConvs();setInterval(loadConvs,8000);
</script></html>`;
                res.type('html').send(html);
            }
        });
        // Admin API endpoints
        config.apiOptions.middleware.push({
            route: '/admin/chatwoot/api',
            handler: async (req: any, res: any, next: any) => {
                try {
                    const service = new (require('../plugins/chatwoot-api/chatwoot.service').ChatwootService)(ChatwootApiPlugin.options);
                    if (req.method === 'GET' && req.path === '/admin/chatwoot/api/conversations') {
                        const convs = await service.listConversations(30);
                        return res.json(convs);
                    }
                    const msgMatch = req.path.match(/^\/admin\/chatwoot\/api\/conversations\/(\d+)\/messages$/);
                    if (msgMatch) {
                        const cid = Number(msgMatch[1]);
                        if (req.method === 'GET') {
                            // In the admin message fetch, ensure we call listMessagesWithMeta so we get decorated messages
                            const msgs = await service.listMessagesWithMeta(cid, 80);
                            return res.json(msgs);
                        }
                        if (req.method === 'POST') {
                            const content = (req.body && req.body.content) || '';
                            if (!content.trim()) return res.status(400).json({ error: 'empty_content' });
                            const m = await service.sendMessage(cid, content, 'outgoing');
                            return res.json({ id: m.id, content: m.content, message_type: m.message_type });
                        }
                    }
                    next();
                } catch (e:any) {
                    res.status(500).json({ error: e.message });
                }
            }
        });
        // Fallback JSON 404 for any unmatched /chat or /chat/api paths to avoid admin redirect noise
        config.apiOptions.middleware.push({
            route: '',
            handler: (req: any, res: any, next: any) => {
                // Translation endpoint fallback: some environments show 'Http failure during parsing' if core route fails.
                // Ensure a minimal JSON is returned so the admin UI doesn't break.
                if (req.method === 'GET' && req.path === '/admin-api' && req.query && req.query.languageCode) {
                    // Only send if not already sent by earlier handlers
                    if (!res.headersSent) {
                        res.json({ languageCode: req.query.languageCode, messages: {}, fallback: true });
                        return;
                    }
                }
                if (req.path.startsWith('/chat') || req.path.startsWith('/admin/chat')) {
                    if (!res.headersSent) {
                        const wantsJson = req.headers['accept'] && req.headers['accept'].includes('application/json');
                        if (wantsJson || req.path.startsWith('/chat/api')) {
                            res.status(404).json({ error: 'Not Found', path: req.path });
                        } else {
                            res.status(404).type('html').send('<!doctype html><title>Not Found</title><h1>Chat resource not found</h1>');
                        }
                        return;
                    }
                }
                next();
            }
        });
        return config;
    },
    compatibility: '^3.0.0',
})
export class ChatFeaturePlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<ChatFeaturePlugin> {
        this.options = options;
        return ChatFeaturePlugin;
    }
}
