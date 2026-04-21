let txs   = JSON.parse(localStorage.getItem('fx_tx')    || '[]');
let goals = JSON.parse(localStorage.getItem('fx_goals') || '[]');
let apiKey = localStorage.getItem('fx_key') || '';
let txType = 'income';
let txFilter = 'all';
let chatHistory = [];

const CAT_ICONS = {
  Salário:'💼', Freelance:'💻', Investimentos:'📈', Alimentação:'🍽️',
  Moradia:'🏠', Transporte:'🚗', Saúde:'❤️', Lazer:'🎮', Educação:'📚', Outros:'📦'
};

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
const fmtDate = d => { if(!d) return ''; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; };
const now = () => new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const today = () => new Date().toISOString().split('T')[0];

window.onload = () => {
  document.getElementById('tx-date').value = today();
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const d = new Date();
  document.getElementById('home-month').textContent = months[d.getMonth()] + ' ' + d.getFullYear();
  if (apiKey) {
    document.getElementById('api-key-input').value = apiKey;
    updateStatus(true);
  }
  renderAll();
};

function goTo(id, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  el.classList.add('active');
  document.getElementById('fab').style.display = (id === 'chat') ? 'none' : 'flex';
}

function renderAll() { renderCards(); renderHomeTx(); renderAllTx(); renderChart(); renderGoals(); }

function renderCards() {
  const d = new Date();
  const cur = txs.filter(t => { const x=new Date(t.date); return x.getMonth()===d.getMonth()&&x.getFullYear()===d.getFullYear(); });
  const inc = cur.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = cur.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal = txs.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0);
  document.getElementById('balance-val').textContent = fmt(bal);
  document.getElementById('balance-sub').textContent = txs.length + ' transações registradas';
  document.getElementById('income-val').textContent = fmt(inc);
  document.getElementById('expense-val').textContent = fmt(exp);
}

function txHTML(t, showDel) {
  return `<div class="tx-item">
    <div class="tx-icon ${t.type}">${CAT_ICONS[t.cat]||'💰'}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.desc}</div>
      <div class="tx-cat">${t.cat}</div>
    </div>
    <div class="tx-right">
      <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
      <div class="tx-date">${fmtDate(t.date)}</div>
    </div>
    ${showDel ? `<button class="tx-del" onclick="deleteTx(${t.id})">×</button>` : ''}
  </div>`;
}

function renderHomeTx() {
  const el = document.getElementById('home-tx-list');
  const recent = txs.slice(0,5);
  el.innerHTML = recent.length ? recent.map(t=>txHTML(t,false)).join('') : '<div class="empty"><div class="icon">🌱</div><p>Nenhuma transação ainda.</p></div>';
}

function renderAllTx() {
  const el = document.getElementById('all-tx-list');
  const list = txFilter==='all' ? txs : txs.filter(t=>t.type===txFilter);
  el.innerHTML = list.length ? list.map(t=>txHTML(t,true)).join('') : '<div class="empty"><div class="icon">🔍</div><p>Nenhuma transação encontrada.</p></div>';
}

function setFilter(f, btn) {
  txFilter = f;
  document.querySelectorAll('#tx-filters .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderAllTx();
}

function renderChart() {
  const d = new Date();
  const months = [];
  for (let i=5;i>=0;i--) {
    const m = new Date(d.getFullYear(), d.getMonth()-i, 1);
    months.push({ month:m.getMonth(), year:m.getFullYear(), label:m.toLocaleString('pt-BR',{month:'short'}) });
  }
  const data = months.map(m => {
    const mt = txs.filter(t=>{ const x=new Date(t.date); return x.getMonth()===m.month&&x.getFullYear()===m.year; });
    return { label:m.label, inc:mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0), exp:mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0) };
  });
  const max = Math.max(...data.map(d=>Math.max(d.inc,d.exp)),1);
  document.getElementById('bar-chart').innerHTML = data.map(d=>`
    <div class="bar-group">
      <div class="bar inc" style="height:${(d.inc/max)*100}%" title="${fmt(d.inc)}"></div>
      <div class="bar exp" style="height:${(d.exp/max)*100}%" title="${fmt(d.exp)}"></div>
    </div>`).join('');
  document.getElementById('bar-labels').innerHTML = data.map(d=>`<span class="bar-lbl">${d.label}</span>`).join('');
}

function renderGoals() {
  const el = document.getElementById('goals-list');
  if (!goals.length) { el.innerHTML = '<div class="empty"><div class="icon">🎯</div><p>Nenhuma meta ainda.</p></div>'; return; }
  el.innerHTML = goals.map(g => {
    const pct = Math.min((g.current/g.target)*100,100).toFixed(0);
    return `<div class="goal-card">
      <div class="goal-top">
        <div><div class="goal-name">${g.name}</div><div class="goal-target">Meta: ${fmt(g.target)}</div></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="goal-emoji">${g.emoji}</span>
          <button class="tx-del" onclick="deleteGoal(${g.id})">×</button>
        </div>
      </div>
      <div class="goal-current">${fmt(g.current)}</div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="goal-meta"><span>${pct}% concluído</span><span>Faltam ${fmt(g.target-g.current)}</span></div>
    </div>`;
  }).join('');
}

function openTxModal() { document.getElementById('tx-modal').classList.add('open'); document.getElementById('tx-date').value=today(); }
function closeTxModal() { document.getElementById('tx-modal').classList.remove('open'); document.getElementById('tx-desc').value=''; document.getElementById('tx-amount').value=''; }

function setType(t) {
  txType = t;
  document.getElementById('btn-income').classList.toggle('active', t==='income');
  document.getElementById('btn-expense').classList.toggle('active', t==='expense');
}

function addTx() {
  const desc = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const cat = document.getElementById('tx-cat').value;
  if (!desc||!amount||amount<=0||!date) { alert('Preencha todos os campos!'); return; }
  txs.unshift({ id:Date.now(), desc, amount, date, cat, type:txType });
  save(); closeTxModal(); renderAll();
}

function deleteTx(id) { txs=txs.filter(t=>t.id!==id); save(); renderAll(); }

function openGoalModal() { document.getElementById('goal-modal').classList.add('open'); }
function closeGoalModal() { document.getElementById('goal-modal').classList.remove('open'); ['goal-name','goal-target','goal-current'].forEach(id=>document.getElementById(id).value=''); document.getElementById('goal-emoji').value='🎯'; }

function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const current = parseFloat(document.getElementById('goal-current').value)||0;
  const emoji = document.getElementById('goal-emoji').value.trim()||'🎯';
  if (!name||!target||target<=0) { alert('Preencha nome e valor alvo!'); return; }
  goals.push({ id:Date.now(), name, target, current, emoji });
  save(); closeGoalModal(); renderGoals();
}

function deleteGoal(id) { goals=goals.filter(g=>g.id!==id); save(); renderGoals(); }

function save() { localStorage.setItem('fx_tx',JSON.stringify(txs)); localStorage.setItem('fx_goals',JSON.stringify(goals)); }

function saveKey() {
  apiKey = document.getElementById('api-key-input').value.trim();
  localStorage.setItem('fx_key', apiKey);
  updateStatus(!!apiKey);
  alert(apiKey ? '✅ Chave salva!' : '⚠️ Chave removida.');
}

function toggleKey() {
  const inp = document.getElementById('api-key-input');
  inp.type = inp.type==='password' ? 'text' : 'password';
}

function updateStatus(on) {
  document.getElementById('status-dot').className = 'status-dot' + (on?' on':'');
  document.getElementById('status-text').textContent = on ? 'IA conectada e pronta' : 'Configure a API Key em Configurações';
}

function clearAll() {
  if (!confirm('Tem certeza? Isso apaga TUDO!')) return;
  txs=[]; goals=[]; save(); renderAll();
}

function setSugg(text) { document.getElementById('chat-input').value=text; document.getElementById('chat-input').focus(); }

function chatKey(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }

function getContext() {
  const d = new Date();
  const mt = txs.filter(t=>{const x=new Date(t.date);return x.getMonth()===d.getMonth()&&x.getFullYear()===d.getFullYear();});
  const inc = mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal = txs.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0);
  const cats = {};
  mt.filter(t=>t.type==='expense').forEach(t=>{cats[t.cat]=(cats[t.cat]||0)+t.amount;});
  const recent = txs.slice(0,5).map(t=>`${t.desc} (${t.type==='income'?'+':'-'}R$${t.amount.toFixed(2)}, ${t.cat})`).join('; ');
  return `Dados financeiros do usuário:\n- Saldo total: R$${bal.toFixed(2)}\n- Receitas deste mês: R$${inc.toFixed(2)}\n- Despesas deste mês: R$${exp.toFixed(2)}\n- Categorias: ${JSON.stringify(cats)}\n- Últimas transações: ${recent||'Nenhuma'}\n- Total de metas: ${goals.length}`;
}

function addMsg(role, text) {
  const wrap = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  const content = text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  el.innerHTML = `<div class="bubble">${content}</div><div class="msg-time">${now()}</div>`;
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
  return el;
}

function addTyping() {
  const wrap = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'msg ai'; el.id = 'typing';
  el.innerHTML = `<div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (!apiKey) {
    addMsg('ai', '⚠️ Configure sua chave Gemini em **Configurações** para usar o chat.');
    return;
  }

  input.value = '';
  addMsg('user', text);
  chatHistory.push({ role:'user', parts:[{text}] });

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  addTyping();

  const sys = `Você é um assistente financeiro pessoal. Responda em português brasileiro, de forma clara e direta.\n${getContext()}\n\nSe o usuário pedir para adicionar uma transação, responda normalmente e inclua ao final (em linha separada):\nADICIONAR_TRANSACAO: {"desc":"...","amount":valor,"date":"YYYY-MM-DD","type":"income ou expense","cat":"categoria"}\n\nCategorias disponíveis: Salário, Freelance, Investimentos, Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Outros`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts:[{text:sys}] },
        contents: chatHistory,
        generationConfig: { temperature:0.7, maxOutputTokens:600 }
      })
    });

    const data = await res.json();
    document.getElementById('typing')?.remove();

    if (data.error) { addMsg('ai', `❌ Erro: ${data.error.message}`); chatHistory.pop(); return; }

    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui processar sua mensagem.';

    const match = reply.match(/ADICIONAR_TRANSACAO:\s*({[^}]+})/i);
    if (match) {
      try {
        const d = JSON.parse(match[1]);
        txs.unshift({ id:Date.now(), desc:d.desc||'Transação', amount:parseFloat(d.amount)||0, date:d.date||today(), cat:d.cat||'Outros', type:d.type||'expense' });
        save(); renderAll();
        reply = reply.replace(match[0],'').trim() + '\n\n✅ **Transação adicionada!**';
      } catch(e) {}
    }

    chatHistory.push({ role:'model', parts:[{text:reply}] });
    addMsg('ai', reply);

  } catch(err) {
    document.getElementById('typing')?.remove();
    addMsg('ai', `❌ Erro de conexão: ${err.message}`);
    chatHistory.pop();
  } finally {
    btn.disabled = false;
  }
}

document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); });
});