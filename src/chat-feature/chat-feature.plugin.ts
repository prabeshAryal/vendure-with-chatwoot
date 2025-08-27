import { PluginCommonModule, Type, VendurePlugin, Logger } from '@vendure/core';
import { ChatwootApiPlugin } from '../plugins/chatwoot-api/chatwoot-api.plugin';

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
let loading = false; let polling = null; let lastMessageCount = 0;
function append(role, content, opts={}){ const wrap=document.createElement('div'); wrap.className='msg '+role; const bubble=document.createElement('div'); bubble.className='bubble'; bubble.innerHTML='<div class="role">'+(role==='user'?'You':'Support')+'</div>'+escapeHtml(content); wrap.appendChild(bubble); chat.appendChild(wrap); requestAnimationFrame(()=>{ chat.scrollTop = chat.scrollHeight; }); if(opts.replace){ opts.replace.replaceWith(wrap); } }
function escapeHtml(str){ return (str||'').replace(/[&<>]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
function setStatus(t){ sub.textContent=t; }
async function api(path, opt){
    const r = await fetch(path,{ headers:{'Content-Type':'application/json'}, ...opt});
    const raw = await r.text();
    if(!r.ok){ throw new Error(raw.slice(0,200)); }
    try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON response'); }
}
async function start(){ setStatus('Starting session...'); const body = { contactSource, conversationId, name: 'Visitor '+(contactSource?contactSource.slice(-4):'') }; const data = await api('/chat/api/start',{ method:'POST', body: JSON.stringify(body)}); contactSource = data.contactSource; conversationId = data.conversationId; localStorage.setItem('cw_contact_source', contactSource); localStorage.setItem('cw_conversation_id', conversationId); setStatus('Connected'); loadMessages(); if(!polling){ polling=setInterval(loadMessages, 4000); } }
async function loadMessages(){ if(!conversationId) return; try { const list = await api('/chat/api/messages?contact='+encodeURIComponent(contactSource)+'&conversation='+conversationId); if(list.length === lastMessageCount) return; lastMessageCount = list.length; chat.innerHTML=''; list.forEach(m=> append(m.message_type==='incoming'?'user':'agent', m.content||'')); } catch(e){ console.warn('msg load', e.message); }
 }
async function sendMessage(text){
    if(!text.trim()) return; 
    // Ensure session
    if(!contactSource || !conversationId){
        try { await start(); } catch(e){ append('agent','(Session error) '+e.message); return; }
    }
    append('user', text); input.value=''; sendBtn.disabled=true; 
    try { 
        await api('/chat/api/messages',{ method:'POST', body: JSON.stringify({ contact: contactSource, conversation: conversationId, content: text })}); 
        await loadMessages(); 
    } catch(e){ append('agent','(Failed to send) '+e.message); }
}
input.addEventListener('input',()=>{ sendBtn.disabled = !input.value.trim(); autoResize(); });
function autoResize(){ input.style.height='54px'; const h = Math.min(input.scrollHeight, 240); input.style.height = h+'px'; }
document.getElementById('chatForm').addEventListener('submit', async e=>{ e.preventDefault(); if(sendBtn.disabled) return; await sendMessage(input.value); });
start();
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

    // Public Chatwoot (Public API) single-conversation endpoints
    config.apiOptions.middleware.push({
            route: '/chat/api',
            handler: async (req: any, res: any, next: any) => {
                // Use CHATWOOT_INBOX_ID as the inbox identifier for public API
                const inboxIdentifier = process.env.CHATWOOT_INBOX_ID;
                const baseUrl = ChatwootApiPlugin.options.baseUrl?.replace(/\/$/, '') || '';
                if (!inboxIdentifier || !baseUrl) {
                    Logger.error(`[PublicChat] Missing configuration - inboxId: ${!!inboxIdentifier}, baseUrl: ${!!baseUrl}`);
                    return res.status(500).json({
                        error: 'chat_config_incomplete',
                        missing: { inboxId: !inboxIdentifier, baseUrl: !baseUrl },
                        env: {
                            CHATWOOT_INBOX_ID: !!process.env.CHATWOOT_INBOX_ID,
                            CHATWOOT_BASE_URL: !!process.env.CHATWOOT_BASE_URL
                        },
                        hint: 'Set CHATWOOT_INBOX_ID and CHATWOOT_BASE_URL in your environment',
                        actualValues: {
                            inboxId: inboxIdentifier || 'missing',
                            baseUrl: baseUrl || 'missing'
                        }
                    });
                }
                // Resolve fetch implementation safely
                let fetchImpl: any = (global as any).fetch;
                if (typeof fetchImpl !== 'function') {
                    try { const nf = require('node-fetch'); fetchImpl = nf.default || nf; } catch {}
                }
                const logPrefix = '[PublicChat]';
                function safeJsonParse(txt: string) { try { return JSON.parse(txt); } catch { return undefined; } }
                try {
                    // Normalize path (support potential full path values)
                    const full = req.originalUrl || req.url || '';
                    const rel = (req.path || '').replace(/^\/chat\/api/, '') || '';
                    const ends = (suffix: string) => full.endsWith(suffix) || rel === suffix || rel === '/'+suffix;
                    Logger.debug(`${logPrefix} Incoming ${req.method} full=${full} rel=${rel}`);
                    // Start session: create or reuse contact + conversation
                    if (req.method === 'POST' && ends('/start')) {
                        const { contactSource, conversationId, name } = req.body || {};
                        let source = contactSource;
                        // Create contact if no source
                        if (!source) {
                            const bodyPayload = { 
                                name: name || 'Visitor',
                                email: `visitor-${Date.now()}@example.com`, // Required by some Chatwoot versions
                                custom_attributes: { 
                                    created_via: 'public-chat', 
                                    ts: Date.now(),
                                    user_agent: req.headers['user-agent'] || 'unknown'
                                } 
                            };
                            
                            // Try multiple API endpoint formats for compatibility
                            const possibleUrls = [
                                `${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts`,
                                `${baseUrl}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/inboxes/${inboxIdentifier}/contacts`,
                                `${baseUrl}/api/v1/inboxes/${inboxIdentifier}/contacts`
                            ];
                            
                            let contactRes: any = null;
                            let lastError = '';
                            
                            for (const url of possibleUrls) {
                                try {
                                    Logger.debug(`[PublicChat] Trying contact creation at: ${url}`);
                                    contactRes = await fetchImpl(url, {
                                        method: 'POST', 
                                        headers: { 'Content-Type': 'application/json' }, 
                                        body: JSON.stringify(bodyPayload)
                                    });
                                    
                                    if (contactRes.ok) {
                                        Logger.debug(`[PublicChat] Contact creation successful with URL: ${url}`);
                                        break;
                                    } else {
                                        const errorText = await contactRes.text();
                                        lastError = `${contactRes.status}: ${errorText}`;
                                        Logger.debug(`[PublicChat] Failed with ${url}: ${lastError}`);
                                        contactRes = null;
                                    }
                                } catch (e: any) {
                                    lastError = e.message;
                                    Logger.debug(`[PublicChat] Exception with ${url}: ${lastError}`);
                                    contactRes = null;
                                }
                            }
                            
                            if (!contactRes || !contactRes.ok) {
                                Logger.error(`[PublicChat] All contact creation URLs failed. Last error: ${lastError}`);
                                return res.status(500).json({ 
                                    error: 'contact_create_failed', 
                                    lastError,
                                    triedUrls: possibleUrls.length,
                                    inboxId: inboxIdentifier,
                                    baseUrl: baseUrl
                                });
                            }
                            
                            const raw = await contactRes.text();
                            Logger.debug(`[PublicChat] Contact create response: ${contactRes.status} ${raw.slice(0, 200)}`);
                            const cj = contactRes.headers.get('content-type')?.includes('application/json') ? safeJsonParse(raw) : undefined;
                            if (!contactRes.ok) {
                                Logger.error(`[PublicChat] Contact create failed ${contactRes.status} raw=${raw.slice(0,300)}`);
                                return res.status(contactRes.status).json({ 
                                    error: 'contact_create_failed', 
                                    status: contactRes.status,
                                    response: raw.slice(0, 200)
                                });
                            }
                            source = cj?.source_id || cj?.id || cj?.contact?.source_id || cj?.contact?.id;
                            if (!source) {
                                Logger.error(`[PublicChat] Contact create missing source_id keys=${Object.keys(cj||{})}`);
                                return res.status(500).json({ 
                                    error: 'contact_source_missing',
                                    availableKeys: Object.keys(cj || {}),
                                    response: cj
                                });
                            }
                            Logger.debug(`[PublicChat] Contact established source=${source}`);
                        }
                        if (!source) return res.status(500).json({ error: 'contact_source_unresolved' });
                        let convId = conversationId;
                        if (!convId) {
                            const convRes = await fetchImpl(`${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${source}/conversations`, { 
                                method: 'POST' 
                            });
                            const cRaw = await convRes.text();
                            Logger.debug(`[PublicChat] Conversation create response: ${convRes.status} ${cRaw.slice(0, 200)}`);
                            const convJson = convRes.headers.get('content-type')?.includes('application/json') ? safeJsonParse(cRaw) : undefined;
                            if (!convRes.ok) {
                                Logger.error(`[PublicChat] Conversation create failed ${convRes.status} raw=${cRaw.slice(0,300)}`);
                                return res.status(convRes.status).json({ 
                                    error: 'conversation_create_failed', 
                                    status: convRes.status,
                                    response: cRaw.slice(0, 200)
                                });
                            }
                            convId = convJson?.id || convJson?.conversation_id || convJson?.conversation?.id;
                            if (!convId) {
                                Logger.error(`[PublicChat] Conversation response missing id keys=${Object.keys(convJson||{})}`);
                                return res.status(500).json({ 
                                    error: 'conversation_id_missing',
                                    availableKeys: Object.keys(convJson || {}),
                                    response: convJson
                                });
                            }
                            Logger.debug(`[PublicChat] Conversation created id=${convId}`);
                        }
                        if (!convId) return res.status(500).json({ error: 'conversation_create_unresolved' });
                        return res.json({ contactSource: source, conversationId: convId });
                    }
                    // List messages
                    if (req.method === 'GET' && ends('/messages')) {
                        const { contact, conversation } = req.query || {};
                        if (!contact || !conversation) return res.status(400).json({ error: 'Missing contact/conversation parameters' });
                        const msgRes = await fetchImpl(`${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contact}/conversations/${conversation}/messages`);
                        const msgRaw = await msgRes.text();
                        Logger.debug(`[PublicChat] Messages list response: ${msgRes.status} ${msgRaw.slice(0, 100)}`);
                        if (!msgRes.ok) {
                            return res.status(msgRes.status).json({ 
                                error: 'upstream_error', 
                                status: msgRes.status,
                                response: msgRaw.slice(0, 200)
                            });
                        }
                        const arr = safeJsonParse(msgRaw) || [];
                        const mapped = Array.isArray(arr) ? arr.map((m: any) => ({ 
                            id: m.id, 
                            content: m.content, 
                            message_type: m.message_type,
                            created_at: m.created_at,
                            sender: m.sender
                        })) : [];
                        return res.json(mapped);
                    }
                    // Send message (incoming from user)
                    if (req.method === 'POST' && ends('/messages')) {
                        const { contact, conversation, content } = req.body || {};
                        if (!contact || !conversation || !content) {
                            return res.status(400).json({ error: 'Missing required fields: contact, conversation, content' });
                        }
                        const payload = { content, echo_id: 'echo-'+Date.now() };
                        const sendRes = await fetchImpl(`${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contact}/conversations/${conversation}/messages`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                        });
                        const raw = await sendRes.text();
                        Logger.debug(`[PublicChat] Send message response: ${sendRes.status} ${raw.slice(0, 100)}`);
                        const jr = sendRes.headers.get('content-type')?.includes('application/json') ? safeJsonParse(raw) : undefined;
                        if (!sendRes.ok) {
                            Logger.error(`${logPrefix} Send failed ${sendRes.status} raw=${raw.slice(0,200)}`);
                            return res.status(sendRes.status).json({ 
                                error: 'send_failed', 
                                status: sendRes.status,
                                response: raw.slice(0, 200)
                            });
                        }
                        return res.json({ 
                            id: jr?.id, 
                            content: jr?.content, 
                            message_type: jr?.message_type,
                            echo_id: jr?.echo_id
                        });
                    }
                    // Resolve conversation
                    if (req.method === 'POST' && ends('/resolve')) {
                        const { contact, conversation } = req.body || {};
                        if (!contact || !conversation) {
                            return res.status(400).json({ error: 'Missing required fields: contact, conversation' });
                        }
                        const resolveRes = await fetchImpl(`${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contact}/conversations/${conversation}/toggle_status`, { 
                            method: 'POST' 
                        });
                        const raw = await resolveRes.text();
                        Logger.debug(`[PublicChat] Resolve response: ${resolveRes.status} ${raw.slice(0, 100)}`);
                        if (!resolveRes.ok) {
                            return res.status(resolveRes.status).json({ 
                                error: 'resolve_failed', 
                                status: resolveRes.status,
                                response: raw.slice(0, 200)
                            });
                        }
                        return res.json({ resolved: true, conversation });
                    }
                    next();
                } catch (e: any) {
                    Logger.error(`${logPrefix} Handler error ${e.message}`);
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
                const html = `<!doctype html><html><head><meta charset=utf-8><title>Agent Chatwoot Console</title><meta name=viewport content="width=device-width,initial-scale=1" />
<style>body{margin:0;font-family:system-ui,Arial,sans-serif;background:#0b0e11;color:#dde4ee;display:flex;flex-direction:column;height:100vh;}header{padding:10px 16px;background:#141a22;border-bottom:1px solid #1f2730;font-size:14px;font-weight:600;letter-spacing:.5px;}main{flex:1;display:flex;min-height:0;}aside{width:260px;border-right:1px solid #1f2730;display:flex;flex-direction:column;}aside h2{margin:0;padding:10px 14px;font-size:12px;letter-spacing:1px;opacity:.6;}#convs{flex:1;overflow:auto;}#convs button{all:unset;display:block;width:100%;padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #1a222c;}#convs button.active{background:#1d2732;}#messages{flex:1;display:flex;flex-direction:column;overflow:auto;padding:14px;gap:10px;} .bubble{max-width:60%;padding:10px 12px;border-radius:12px;line-height:1.4;font-size:13px;background:#1d2732;box-shadow:0 1px 2px #0006;} .out{align-self:flex-end;background:#2563eb;color:#fff;} footer{border-top:1px solid #1f2730;padding:10px;background:#141a22;display:flex;gap:8px;}footer input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid #2c3947;background:#1a222c;color:#fff;}footer button{background:#2563eb;border:none;color:#fff;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;}footer button:disabled{opacity:.4;cursor:not-allowed;} .meta{font-size:11px;opacity:.55;text-align:center;padding:4px 0;} .idtag{opacity:.5;font-size:10px;margin-top:2px;} .err{color:#f87171;font-size:12px;padding:4px 8px;background:#2d1a1a;border:1px solid #f87171;margin:6px 10px;border-radius:6px;}
</style></head><body><header>Agent Chatwoot Console</header><main><aside><h2>CONVERSATIONS</h2><div id="convErr" class="err" style="display:none"></div><div id="convs"></div></aside><section style="flex:1;display:flex;flex-direction:column;min-width:0;"><div id="messages"></div><div class="meta" id="status">Idle</div><footer><input id="msgInput" placeholder="Type reply..." autocomplete="off"/><button id="sendBtn" disabled>Send</button></footer></section></main><script>
const el=id=>document.getElementById(id);const convsEl=el('convs');const msgsEl=el('messages');const statusEl=el('status');const input=el('msgInput');const sendBtn=el('sendBtn');const convErr=el('convErr');let current=null;async function fetchJson(u,opt){const r=await fetch(u,opt);const t=await r.text();if(!r.ok) throw new Error(t.slice(0,200));try{return JSON.parse(t);}catch{return t;} }
async function loadConvs(){status('Loading conversations...');try{const list=await fetchJson('/admin/chatwoot/api/conversations');renderConvs(list);}catch(e){convErr.style.display='block';convErr.textContent='Conversations error: '+e.message;} }
function renderConvs(list){convsEl.innerHTML='';list.forEach(c=>{const b=document.createElement('button');b.textContent='#'+c.id+(c.last_message_content?' • '+c.last_message_content.slice(0,30):'');if(c.id===current) b.classList.add('active');b.onclick=()=>{selectConv(c.id)};convsEl.appendChild(b);}); if(current && !list.find(c=>c.id===current)){current=null;msgsEl.innerHTML='';}}
async function selectConv(id){current=id;updateButtons();await loadMessages();renderConvs(await fetchJson('/admin/chatwoot/api/conversations'));}
async function loadMessages(){if(!current) return;status('Loading messages...');msgsEl.innerHTML='';try{const list=await fetchJson('/admin/chatwoot/api/conversations/'+current+'/messages');list.forEach(m=>appendMsg(m));status('Conversation #'+current);}catch(e){appendSystem('(Failed to load messages) '+e.message);} }
function appendMsg(m){const wrap=document.createElement('div');wrap.className='bubble '+(m.message_type==='outgoing'?'out':'in');wrap.innerHTML='<strong>'+(m.message_type==='outgoing'?'Agent':'User')+'</strong><div>'+escapeHtml(m.content||'')+'</div><div class="idtag">'+m.id+'</div>';msgsEl.appendChild(wrap);msgsEl.scrollTop=msgsEl.scrollHeight;}
function appendSystem(t){const w=document.createElement('div');w.className='bubble';w.style.opacity=.6;w.textContent=t;msgsEl.appendChild(w);}
function escapeHtml(s){return (s||'').replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));}
function status(t){statusEl.textContent=t;}
async function send(){if(!current||!input.value.trim()) return;const text=input.value.trim();input.value='';updateButtons();appendMsg({content:text,message_type:'outgoing',id:'temp-'+Date.now()});try{await fetchJson('/admin/chatwoot/api/conversations/'+current+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text})});await loadMessages();}catch(e){appendSystem('(Send failed) '+e.message);} }
function updateButtons(){sendBtn.disabled=!input.value.trim()||!current;}
input.addEventListener('input',updateButtons);sendBtn.onclick=()=>send();loadConvs();setInterval(loadConvs,8000);
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
