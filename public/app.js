let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = false;
});

async function instalarApp() {
  if (!deferredInstallPrompt) {
    alert('Se o botão automático não aparecer, abra o menu do navegador e toque em “Adicionar à tela inicial”.');
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = true;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}

function val(id) {
  return document.getElementById(id).value;
}

function setUser(user) {
  document.getElementById('userBox').textContent = user
    ? `${user.name || user.email} · plano ${user.plan} · ${user.credits} créditos`
    : 'Você ainda não entrou.';
}

async function signup() {
  try {
    const d = await api('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name: val('name'), email: val('email'), password: val('password') })
    });
    setUser(d.user);
  } catch (e) {
    alert(e.message);
  }
}

async function login() {
  try {
    const d = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: val('email'), password: val('password') })
    });
    setUser(d.user);
    loadHistory();
  } catch (e) {
    alert(e.message);
  }
}

async function logout() {
  try {
    await api('/api/logout', { method: 'POST' });
    setUser(null);
  } catch (e) {
    alert(e.message);
  }
}

async function generate() {
  const result = document.getElementById('result');
  result.textContent = 'Gerando...';
  try {
    const d = await api('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        audience: val('audience'),
        type: val('type'),
        businessName: val('businessName'),
        topic: val('topic'),
        tone: val('tone')
      })
    });
    result.textContent = d.content;
    const me = await api('/api/me');
    setUser(me.user);
    loadHistory();
  } catch (e) {
    result.textContent = e.message;
  }
}

async function loadPlans() {
  const d = await api('/api/plans');
  document.getElementById('plans').innerHTML = Object.entries(d.plans).map(([id, p]) => `
    <article class="plan">
      <h3>${p.name}</h3>
      <strong>${p.price}</strong>
      <p>${p.credits} créditos · ${p.label}</p>
      ${id === 'free' ? '' : `<button onclick="upgrade('${id}')">Solicitar upgrade</button>`}
    </article>
  `).join('');
}

async function upgrade(plan) {
  try {
    const d = await api('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
    const parts = [
      `${d.message}`,
      `Plano: ${d.planName}`,
      `Valor: ${d.price}`,
      `Créditos: ${d.credits}`
    ];
    if (d.pixKey) parts.push(`Chave Pix/NG.CASH: ${d.pixKey}`);
    if (d.contact) parts.push(`Enviar comprovante: ${d.contact}`);
    const paymentText = parts.join('\\n');
    if (d.paymentLink) {
      if (confirm(paymentText + '\\n\\nAbrir link de pagamento agora?')) window.open(d.paymentLink, '_blank');
    } else {
      alert(paymentText + '\\n\\nConfigure NG_CASH_PAYMENT_LINK ou NG_CASH_PIX_KEY no Render.');
    }
  } catch (e) {
    if (confirm(e.message + '\\n\\nAtivar em modo demonstração?')) {
      try {
        const d = await api('/api/checkout/mock', {
          method: 'POST',
          body: JSON.stringify({ plan })
        });
        setUser(d.user);
        alert(d.message);
      } catch (err) {
        alert(err.message);
      }
    }
  }
}

async function loadHistory() {
  try {
    const d = await api('/api/history');
    document.getElementById('history').innerHTML = d.items.map(i => `
      <article>
        <strong>${i.topic}</strong>
        <p>${i.audience} · ${i.type}</p>
        <small>${new Date(i.createdAt).toLocaleString('pt-BR')}</small>
      </article>
    `).join('') || '<p class="muted">Nada gerado ainda.</p>';
  } catch (e) {}
}

function copyResult() {
  navigator.clipboard.writeText(document.getElementById('result').textContent);
  alert('Copiado.');
}

(async () => {
  loadPlans();
  const me = await api('/api/me');
  setUser(me.user);
  loadHistory();
})();
