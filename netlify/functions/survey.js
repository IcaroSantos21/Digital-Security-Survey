import { getStore } from '@netlify/blobs';

const scamTypes = [
  'Falso parente pedindo dinheiro',
  'Link falso',
  'Pix',
  'Falsa central do banco',
  'Outro'
];

const ADMIN_PASSWORD = process.env.SURVEY_ADMIN_PASSWORD || '';

const jsonResponse = (statusCode, payload) =>
  new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });

const store = getStore({ name: 'survey-responses' });

const readEntries = async () => {
  try {
    const data = await store.get('responses', { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const writeEntries = async (entries) => {
  await store.set('responses', JSON.stringify(entries));
};

const isAuthorized = (password = '') => {
  if (!ADMIN_PASSWORD) {
    return false;
  }

  return password === ADMIN_PASSWORD;
};

const normalizeEntry = (body = {}) => ({
  nome: String(body.nome || 'Respondente anônimo').trim(),
  q1: body.q1 || '',
  q2: body.q2 || '',
  q3: Array.isArray(body.q3) ? body.q3 : [],
  q4: body.q4 || '',
  q5: body.q5 || '',
  q6: body.q6 || '',
  q7: body.q7 || '',
  q8: body.q8 || '',
  q9: body.q9 || '',
  q10: body.q10 || '',
  dataAutorizacao: body.dataAutorizacao || '',
  assinatura: String(body.assinatura || 'Não informado').trim(),
  createdAt: new Date().toISOString()
});

const calculateEducationScore = (entries) => {
  if (!entries.length) {
    return 0;
  }

  const baseScores = {
    Sim: 2,
    'Mais ou menos': 1,
    'Sempre': 2,
    'Às vezes': 1,
    'Todo dia': 2,
    'Algumas vezes por semana': 1,
    'Não': 0,
    'Não sei': 0,
    'Não sei o que é': 0,
    Nunca: 0,
    Raramente: 0,
    'Não se aplica': 0
  };

  let total = 0;
  let max = 0;

  entries.forEach((entry) => {
    ['q7', 'q8', 'q9', 'q10'].forEach((key) => {
      const value = entry[key] || 'Não';
      total += baseScores[value] ?? 0;
      max += 2;
    });
  });

  return Math.round((total / max) * 100);
};

const buildSummary = (entries) => {
  const scamCounts = Object.fromEntries(scamTypes.map((type) => [type, 0]));

  entries.forEach((entry) => {
    const type = entry.q6;
    if (type && scamCounts[type] !== undefined) {
      scamCounts[type] += 1;
    }
  });

  const ordered = Object.entries(scamCounts)
    .map(([type, value]) => ({ type, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const maxCount = Math.max(...ordered.map((item) => item.value), 1);

  return {
    count: entries.length,
    totalSuspect: entries.filter((entry) => entry.q4 === 'Sim').length,
    totalFalls: entries.filter((entry) => ['Sim', 'Quase caí'].includes(entry.q5)).length,
    educationScore: calculateEducationScore(entries),
    commonScams: ordered.map((item) => ({
      type: item.type,
      value: item.value,
      percentage: Math.round((item.value / maxCount) * 100)
    }))
  };
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  const url = new URL(req.url);
  const admin = url.searchParams.get('admin') === 'true';
  const summaryOnly = url.searchParams.get('summary') === 'true';
  const password = url.searchParams.get('password') || req.headers.get('x-admin-password') || '';

  const entries = await readEntries();

  if (req.method === 'GET') {
    if (admin) {
      if (!isAuthorized(password)) {
        return jsonResponse(401, { error: 'Acesso negado. Senha administrativa inválida.' });
      }

      return jsonResponse(200, { entries });
    }

    if (summaryOnly) {
      return jsonResponse(200, buildSummary(entries));
    }

    return jsonResponse(200, { count: entries.length });
  }

  if (req.method === 'POST') {
    if (url.searchParams.get('reset') === 'true') {
      if (!isAuthorized(password)) {
        return jsonResponse(401, { error: 'Acesso negado. Senha administrativa inválida.' });
      }

      await writeEntries([]);
      return jsonResponse(200, { success: true, count: 0 });
    }

    try {
      const body = await req.json();
      const normalized = normalizeEntry(body);
      const nextEntries = [...entries, normalized];
      await writeEntries(nextEntries);
      return jsonResponse(200, { success: true, count: nextEntries.length });
    } catch (error) {
     console.error('Erro no POST /api/survey:', error);
     return jsonResponse(400, { error: 'Dados inválidos.' });
   }
  }

  if (req.method === 'DELETE' || url.searchParams.get('reset') === 'true') {
    if (!isAuthorized(password)) {
      return jsonResponse(401, { error: 'Acesso negado. Senha administrativa inválida.' });
    }

    await writeEntries([]);
    return jsonResponse(200, { success: true, count: 0 });
  }

  return jsonResponse(405, { error: 'Método não permitido.' });
};
