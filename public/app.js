let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredInstallPrompt = event;
  const btn = document.getElementById('installBtn'); if (btn) btn.hidden = false;
});
async function instalarApp(){ if(!deferredInstallPrompt){alert('Abra o menu do Chrome e toque em “Adicionar à tela inicial”.');return;} deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; document.getElementById('installBtn').hidden=true; }

async function api(path, options = {}) {
  const res = await fetch(path, { credentials:'include', headers:{'Content-Type':'application/json'}, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}
const val = id => document.getElementById(id)?.value || '';
function setUser(user){ document.getElementById('userBox').textContent = user ? `${user.name || user.email} · ${user.credits} créditos` : 'Você ainda não entrou.'; }
function esc(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function addMessage(role, content){
  const box=document.getElementById('chatMessages');
  const article=document.createElement('article'); article.className=`msg ${role}`;
  article.innerHTML=`<div class="avatar">${role==='user'?'S':'N'}</div><div class="bubble">${role==='assistant'?'<strong>Nexa Digital</strong>':''}<p>${esc(content)}</p></div>`;
  box.appendChild(article); box.scrollTop=box.scrollHeight;
}
function renderMessages(messages){
  const box=document.getElementById('chatMessages'); box.innerHTML='';
  const list=messages?.length?messages:[{role:'assistant',content:'Oi, Sarah. Sou seu chat de IA. Me peça posts, ideias, mensagens de venda, calendário, aulas ou qualquer ajuda prática.'}];
  list.forEach(m=>addMessage(m.role,m.content));
}

async function signup(){try{const d=await api('/api/signup',{method:'POST',body:JSON.stringify({name:val('name'),email:val('email'),password:val('password')})});setUser(d.user);await loadChat();}catch(e){alert(e.message)}}
async function login(){try{const d=await api('/api/login',{method:'POST',body:JSON.stringify({email:val('email'),password:val('password')})});setUser(d.user);await loadChat();}catch(e){alert(e.message)}}
async function logout(){try{await api('/api/logout',{method:'POST'});setUser(null);renderMessages([]);}catch(e){alert(e.message)}}
async function loadChat(){try{const d=await api('/api/chat');renderMessages(d.messages);}catch(e){}}
async function sendChat(message){
  addMessage('user',message);
  const wait=document.createElement('article'); wait.className='msg assistant'; wait.id='typing'; wait.innerHTML='<div class="avatar">N</div><div class="bubble"><strong>Nexa Digital</strong><p>Digitando...</p></div>'; document.getElementById('chatMessages').appendChild(wait);
  try{const d=await api('/api/chat',{method:'POST',body:JSON.stringify({message})}); wait.remove(); renderMessages(d.messages); const me=await api('/api/me'); setUser(me.user);}catch(e){wait.remove(); addMessage('assistant',e.message);}
}
async function loadPlans(){
  const d=await api('/api/plans');
  document.getElementById('plans').innerHTML=Object.entries(d.plans).map(([id,p])=>`<article class="plan"><h4>${p.name}</h4><strong>${p.price}</strong><p>${p.credits} créditos · ${p.label}</p>${id==='free'?'':`<button onclick="upgrade('${id}')">Solicitar</button>`}</article>`).join('');
}
async function upgrade(plan){try{const d=await api('/api/checkout',{method:'POST',body:JSON.stringify({plan})});const parts=[d.message,`Plano: ${d.planName}`,`Valor: ${d.price}`,`Créditos: ${d.credits}`];if(d.pixKey)parts.push(`Pix/NG.CASH: ${d.pixKey}`);if(d.contact)parts.push(`Comprovante: ${d.contact}`);if(d.paymentLink&&confirm(parts.join('\n')+'\n\nAbrir link?'))window.open(d.paymentLink,'_blank');else alert(parts.join('\n'));}catch(e){alert(e.message)}}

document.getElementById('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('chatInput');const text=input.value.trim();if(!text)return;input.value='';sendChat(text);});
document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('chatForm').requestSubmit();}});
(async()=>{loadPlans();const me=await api('/api/me');setUser(me.user);await loadChat();})();
