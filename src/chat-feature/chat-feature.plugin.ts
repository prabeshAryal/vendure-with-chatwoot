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
<style>
*{box-sizing:border-box;}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;background:#0f1115;color:#f5f7fa;display:flex;flex-direction:column;min-height:100vh;-webkit-font-smoothing:antialiased;}h1{margin:0;font-size:15px;font-weight:600;letter-spacing:.5px;}
header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:linear-gradient(90deg,#1d2430,#202a38 40%,#1d2430);border-bottom:1px solid #222;box-shadow:0 1px 2px rgba(0,0,0,.4);}header .dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b98199;}header .sub{font-size:11px;opacity:.65;font-weight:500;}
#chat{flex:1;display:flex;flex-direction:column;max-width:840px;width:100%;margin:0 auto;padding:8px 14px 120px;overflow-y:auto;scroll-behavior:smooth;}
.msg{display:flex;gap:10px;margin:10px 0;}
.msg.agent .bubble{background:#1f2733;border:1px solid #273244;} .msg.user .bubble{background:#2563eb;border:1px solid #1d4ed8;} .bubble{padding:12px 14px;border-radius:14px;max-width:640px;line-height:1.5;font-size:14px;white-space:pre-wrap;word-wrap:break-word;box-shadow:0 2px 4px -2px #0008,0 0 0 1px #0002;color:#e5ecf5;}
.role{font-size:11px;opacity:.6;margin-bottom:4px;text-transform:uppercase;letter-spacing:.7px;font-weight:600;}
.msg.user{justify-content:flex-end;} .msg.user .bubble{border-bottom-right-radius:4px;} .msg.agent .bubble{border-bottom-left-radius:4px;}
footer{position:fixed;left:0;right:0;bottom:0;background:#14181f;border-top:1px solid #222;padding:12px 16px;display:flex;justify-content:center;}form{display:flex;gap:10px;width:100%;max-width:840px;}textarea{flex:1;background:#1b222c;color:#f5f7fa;border:1px solid #2c394b;border-radius:10px;padding:12px 14px;resize:none;min-height:54px;max-height:240px;font-size:14px;line-height:1.4;outline:none;box-shadow:0 0 0 2px transparent;transition:.15s;}textarea:focus{border-color:#2563eb;box-shadow:0 0 0 2px #2563eb55;}button{background:#2563eb;color:#fff;border:none;font-weight:600;padding:0 20px;border-radius:10px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px -2px #2563eb55,0 0 0 1px #1d4ed8;transition:.15s;}button:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}button:not(:disabled):hover{background:#1d4ed8;}
.meta{font-size:11px;opacity:.45;text-align:center;margin-top:30px;} .thinking{display:inline-block;width:26px;text-align:left;} .thinking span{display:inline-block;width:6px;height:6px;margin:0 2px;background:#64748b;border-radius:50%;animation:pulse 1s infinite ease-in-out;}@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.85);}40%{opacity:.9;transform:scale(1);}}
.statusline{font-size:11px;opacity:.55;text-align:center;margin-top:6px;}
.sys{font-size:11px;opacity:.55;text-align:center;margin:14px 0;}
</style></head><body>
<header><div class="dot"></div><div><h1>Support Chat</h1><div class="sub" id="sub">Starting session...</div></div></header>
<main id="chat"></main>
<footer><form id="chatForm"><textarea id="input" placeholder="Type your message..." autocomplete="off"></textarea><button id="sendBtn" type="submit" disabled>Send</button></form></footer>
<script>
const el = sel => document.querySelector(sel);
const chat = el('#chat');
const input = el('#input');
const sendBtn = el('#sendBtn');
const sub = el('#sub');
let contactSource = localStorage.getItem('cw_contact_source');
let conversationId = localStorage.getItem('cw_conversation_id');
let loading = false; let polling = null; const lastMessageIds = new Set();
function append(role, content, opts={}){
    const wrap=document.createElement('div');
    wrap.className='msg '+role;
    const bubble=document.createElement('div');
    bubble.className='bubble';
    bubble.innerHTML='<div class="role">'+(role==='user'?'You':'Agent')+'</div>'+escapeHtml(content);
    wrap.appendChild(bubble);
    chat.appendChild(wrap);
    requestAnimationFrame(()=>{ chat.scrollTop = chat.scrollHeight; });
    if(opts.replace){ opts.replace.replaceWith(wrap); }
}

// FIX: Removed the unused and confusing getRole() function. The backend now provides a simple 'side' property.

function escapeHtml(str){ return (str||'').replace(/[&<>]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
function setStatus(t){ sub.textContent=t; }
async function api(path, opt){
    const r = await fetch(path,{ headers:{'Content-Type':'application/json'}, ...opt});
    const raw = await r.text();
    if(!r.ok){ throw new Error(raw.slice(0,200)); }
    try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON response'); }
}
async function start(){ setStatus('Starting session...'); const body = { contactSource, conversationId, name: 'Visitor '+(contactSource?contactSource.slice(-4):'') }; const data = await api('/chat/api/start',{ method:'POST', body: JSON.stringify(body)}); contactSource = data.contactSource; conversationId = data.conversationId; localStorage.setItem('cw_contact_source', contactSource); localStorage.setItem('cw_conversation_id', conversationId); setStatus('Connected'); loadMessages(); if(!polling){ polling=setInterval(loadMessages, 4000); } }
async function loadMessages(){
    if(!conversationId) return;
    try {
        const list = await api('/chat/api/messages?contact='+encodeURIComponent(contactSource)+'&conversation='+conversationId);
        list.sort((a,b)=>(a.created_at||0)-(b.created_at||0));
        
        // FIX: This is the primary bug fix. Instead of clearing the entire chat on every poll (which causes flickering),
        // we now check if a message has already been rendered and only append new ones.
        // This makes the UI performant and allows users to scroll up without interruption.
        for(const m of list){
            if (!lastMessageIds.has(m.id)) {
                const role = m.side === 'visitor' ? 'user' : 'agent';
                append(role, m.content||'');
                lastMessageIds.add(m.id);
            }
        }
    } catch(e){ console.warn('msg load', e.message); }
}
async function sendMessage(text){
    if(!text.trim()) return;
    if(!contactSource || !conversationId){
        try { await start(); } catch(e){ append('agent','(Session error) '+e.message); return; }
    }
    const temp = { content: text };
    append('user', text, { replace: null });
    input.value=''; sendBtn.disabled=true;
    try {
        await api('/chat/api/messages',{ method:'POST', body: JSON.stringify({ contact: contactSource, conversation: conversationId, content: text })});
        // Refresh after send to show server-authoritative ordering
        await loadMessages();
    } catch(e){ append('agent','(Failed to send) '+e.message); }
}
input.addEventListener('input',()=>{ sendBtn.disabled = !input.value.trim(); autoResize(); });
function autoResize(){ input.style.height='54px'; const h = Math.min(input.scrollHeight, 240); input.style.height = h+'px'; }
document.getElementById('chatForm').addEventListener('submit', async e=>{ e.preventDefault(); if(sendBtn.disabled) return; await sendMessage(input.value); });
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
    const chatwootService = new ChatwootService(ChatwootApiPlugin.options);
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
                        const msgs = await chatwootService.listMessagesFresh(cid, 120);
                        const mapped = msgs.map(m => {
                            const orig: any = (m as any).original_message_type ?? (m as any).message_type;
                            let side: 'visitor' | 'agent';
                            if (orig === 0 || orig === 'incoming') side = 'visitor';
                            else if (orig === 1 || orig === 'outgoing') side = 'agent';
                            else if (orig === 2 || orig === 'note') side = 'agent'; // system/activity -> agent side
                            else side = 'agent';
                            const sender_name = side === 'visitor' ? 'You' : 'Agent';
                            const direction = side === 'visitor' ? 'incoming' : 'outgoing';
                            return { id: (m as any).id, content: (m as any).content, message_type: orig, created_at: (m as any).created_at, direction, sender_name, side };
                        }).sort((a,b)=> (a.created_at||0)-(b.created_at||0));
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
                        const visitorService = new ChatwootService(ChatwootApiPlugin.options);
                        const msg = await visitorService.sendPublicMessage(cid, content);
                        return res.json({ id: msg.id, content: msg.content, message_type: msg.message_type, side: 'visitor', sender_name: 'You' });
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
</style></head><body><header>Agent Chatwoot Console <button class=resolve id=resolveBtn disabled>Resolve</button></header><main><aside><h2>CONVERSATIONS</h2><div id=\"convErr\" class=\"err\" style=\"display:none\"></div><div id=\"convs\"></div></aside><section style=\"flex:1;display:flex;flex-direction:column;min-width:0;\"><div id=\"messages\"></div><div class=\"meta\" id=\"status\">Idle</div><footer><input id=\"msgInput\" placeholder=\"Type reply...\" autocomplete=\"off\"/><button id=\"sendBtn\" disabled>Send</button></footer></section></main><script>
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
                            const msgs = await service.listMessages(cid, 80);
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