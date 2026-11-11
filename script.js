const API_URL = '/api/survey';

const renderSummary = (summary) => {
  const totalRespondentes = document.getElementById('totalRespondentes');
  const totalGolpes = document.getElementById('totalGolpes');
  const educacaoNivel = document.getElementById('educacaoNivel');
  const golpesMaisComuns = document.getElementById('golpesMaisComuns');
  const scoreLabel = document.getElementById('scoreLabel');
  const scoreValue = document.getElementById('scoreValue');
  const scoreProgress = document.getElementById('scoreProgress');
  const resumoLista = document.getElementById('resumoLista');

  const count = summary?.count || 0;
  const educationScore = summary?.educationScore || 0;
  const commonScams = summary?.commonScams || [];

  let label = 'Precisa de atenção';
  if (educationScore >= 75) label = 'Muito bem preparada';
  else if (educationScore >= 50) label = 'Em desenvolvimento';

  totalRespondentes.textContent = String(count);
  totalGolpes.textContent = String(summary?.totalFalls || 0);
  educacaoNivel.textContent = `${educationScore}%`;
  scoreLabel.textContent = label;
  scoreValue.textContent = `${educationScore}%`;
  scoreProgress.style.width = `${educationScore}%`;

  if (commonScams.length) {
    const maxValue = Math.max(...commonScams.map((item) => item.value), 1);
    golpesMaisComuns.innerHTML = commonScams
      .map((item) => `
        <div class="bar-row">
          <span class="bar-label">${item.type}</span>
          <div class="bar-track"><span class="bar-fill" style="width: ${(item.value / maxValue) * 100}%"></span></div>
          <strong>${item.value}</strong>
        </div>
      `)
      .join('');
  } else {
    golpesMaisComuns.innerHTML = '<p>Sem dados suficientes para mostrar os golpes mais comuns.</p>';
  }

  resumoLista.innerHTML = [
    `${count} respostas registradas`,
    `${summary?.totalSuspect || 0} pessoas receberam algo suspeito`,
    `${summary?.totalFalls || 0} relataram já terem caído ou quase caído em golpes`,
    `${educationScore}% de educação digital geral`
  ].map((item) => `<li>${item}</li>`).join('');
};

const renderAdminResponses = (entries) => {
  const adminResponsesBox = document.getElementById('adminResponsesBox');
  const adminResponsesList = document.getElementById('adminResponsesList');

  if (!entries || !entries.length) {
    adminResponsesList.innerHTML = '<p>Nenhuma resposta cadastrada até o momento.</p>';
    adminResponsesBox.classList.remove('hidden');
    return;
  }

  adminResponsesList.innerHTML = entries
    .map((entry) => `
      <div class="admin-item">
        <strong>${entry.nome || 'Respondente anônimo'}</strong>
        <small>${entry.q1 || '—'} • ${entry.q2 || '—'}</small>
        <small>Golpe: ${entry.q6 || '—'} • Educação: ${entry.q7 || '—'}</small>
      </div>
    `)
    .join('');

  adminResponsesBox.classList.remove('hidden');
};

const fetchSummary = async () => {
  try {
    const response = await fetch(`${API_URL}?summary=true`, { method: 'GET' });
    if (!response.ok) {
      throw new Error('Erro ao buscar resumo');
    }
    const data = await response.json();
    renderSummary(data);
  } catch (error) {
    console.error(error);
    renderSummary({ count: 0, totalSuspect: 0, totalFalls: 0, educationScore: 0, commonScams: [] });
  }
};

const requestAdminAccess = async () => {
  const password = document.getElementById('adminPassword').value.trim();

  if (!password) {
    alert('Informe a senha administrativa.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}?admin=true&password=${encodeURIComponent(password)}`);

    if (!response.ok) {
      throw new Error('Senha inválida');
    }

    const data = await response.json();
    renderAdminResponses(data.entries || []);
    document.getElementById('adminLoginBox').classList.add('hidden');
    alert('Acesso liberado.');
  } catch (error) {
    console.error(error);
    alert('Senha incorreta ou acesso não autorizado.');
  }
};

const resetAllResponses = async () => {
  const password = document.getElementById('adminPassword').value.trim();

  try {
    const response = await fetch(`${API_URL}?reset=true&password=${encodeURIComponent(password)}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Não foi possível limpar os dados');
    }

    await fetchSummary();
    renderAdminResponses([]);
    alert('Todas as respostas foram removidas.');
  } catch (error) {
    console.error(error);
    alert('Para limpar os dados, informe a senha administrativa correta.');
  }
};

const serializeForm = (form) => {
  const formData = new FormData(form);
  return {
    nome: formData.get('nome') || 'Respondente anônimo',
    q1: formData.get('q1') || '',
    q2: formData.get('q2') || '',
    q3: formData.getAll('q3'),
    q4: formData.get('q4') || '',
    q5: formData.get('q5') || '',
    q6: formData.get('q6') || '',
    q7: formData.get('q7') || '',
    q8: formData.get('q8') || '',
    q9: formData.get('q9') || '',
    q10: formData.get('q10') || '',
    dataAutorizacao: formData.get('dataAutorizacao') || '',
    assinatura: formData.get('assinatura') || 'Não informado'
  };
};

const exportCsv = async () => {
  const adminPassword = document.getElementById('adminPassword').value.trim();

  try {
    const response = await fetch(`${API_URL}?admin=true&password=${encodeURIComponent(adminPassword || '')}`);
    if (!response.ok) {
      throw new Error('Acesso negado');
    }

    const data = await response.json();
    const entries = data.entries || [];

    if (!entries.length) {
      alert('Ainda não há respostas para exportar.');
      return;
    }

    const columns = ['nome', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'dataAutorizacao', 'assinatura'];
    const csvRows = [columns.join(',')];

    entries.forEach((entry) => {
      const row = columns.map((column) => {
        const value = Array.isArray(entry[column]) ? entry[column].join('; ') : (entry[column] ?? '');
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pesquisa-seguranca-digital.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Para exportar CSV, informe a senha administrativa correta.');
  }
};

const setupTabs = () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;

      tabButtons.forEach((tabButton) => {
        const active = tabButton === button;
        tabButton.classList.toggle('active', active);
        tabButton.setAttribute('aria-selected', String(active));
      });

      tabPanels.forEach((panel) => {
        const active = panel.id === `${target}Tab`;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  fetchSummary();

  document.getElementById('surveyForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = serializeForm(form);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar a resposta');
      }

      form.reset();
      await fetchSummary();
      alert('Resposta salva com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar a resposta. Tente novamente.');
    }
  });

  document.getElementById('toggleAdminBtn').addEventListener('click', () => {
    const box = document.getElementById('adminLoginBox');
    box.classList.toggle('hidden');
  });

  document.getElementById('adminLoginBtn').addEventListener('click', requestAdminAccess);
  document.getElementById('resetResponsesBtn').addEventListener('click', resetAllResponses);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
});
