// ════════════════════════════════════════════════════════════════════════
// RELATÓRIO SEMANAL — Facebook Ads → WhatsApp
// v2.0 — Arquitetura baseada em optimization_goal (fonte única de verdade)
//
// COMO ADICIONAR UM NOVO TIPO DE CAMPANHA:
//   1. Adicionar linha em MAPA_GOAL:  "NOVO_GOAL": "action_type_da_api"
//   2. Adicionar linha em LABEL_MAP:  "action_type_da_api": ["Label", "BLOCO"]
//   3. Se necessário, adicionar bloco em buildMensagem() para o novo BLOCO
//   4. Rodar o Node de Testes antes de publicar
// ════════════════════════════════════════════════════════════════════════

const items = $input.all();
const campanhas = {};

// ── Mapeia optimization_goal → action_type da API do Meta
// Prefixos especiais __reach__ e __impressions__ são campos raiz (não são actions)
// NOTA profile_visit: usa inline_link_clicks como proxy — funciona para campanhas
// com destino "Perfil do Instagram". Revisitar se o formato do anúncio mudar.
const MAPA_GOAL = {
  "CONVERSATIONS":           "onsite_conversion.messaging_conversation_started_7d",
  "MESSAGES":                "onsite_conversion.messaging_conversation_started_7d",
  "LINK_CLICKS":             "link_click",
  "LANDING_PAGE_VIEWS":      "landing_page_view",
  "LEAD_GENERATION":         "lead",
  "QUALITY_LEAD":            "lead",
  "POST_ENGAGEMENT":         "post_engagement",
  "VIDEO_VIEWS":             "video_view",
  "PAGE_LIKES":              "like",
  "OFFSITE_CONVERSIONS":     "purchase",
  "VALUE":                   "purchase",
  "VISIT_INSTAGRAM_PROFILE": "profile_visit",
  "PROFILE_VISIT":           "profile_visit",
  "REACH":                   "__reach__",
  "BRAND_AWARENESS":         "__reach__",
  "IMPRESSIONS":             "__impressions__",
};

// ── Mapeia action_type → [label da mensagem, bloco de métricas]
// bloco determina qual seção buildMensagem() vai renderizar
const LABEL_MAP = {
  "onsite_conversion.messaging_conversation_started_7d": ["Conversas Iniciadas", "MESSAGES"],
  "link_click":        ["Cliques no Link",    "TRAFFIC"],
  "landing_page_view": ["Visitas na Página",  "TRAFFIC"],
  "lead":              ["Leads",              "LEADS"],
  "post_engagement":   ["Engajamento",        "ENGAGEMENT"],
  "video_view":        ["Views de Vídeo",     "VIDEO"],
  "like":              ["Curtidas na Página", "ENGAGEMENT"],
  "purchase":          ["Compras",            "SALES"],
  "profile_visit":     ["Cliques no Perfil",  "FOLLOWERS"],
};

// ── Determina resultado principal + bloco da mensagem
// Retorna { label, valor, bloco } — mesma fonte usada por buildMensagem()
// Garante que 🎯 Resultado e o bloco de métricas nunca divergem
const getMetrica = (goal, impressions, reach, inlineClicks, actions) => {
  const ga = (t) => { const a = actions.find(a => a.action_type === t); return a ? parseFloat(a.value) : 0; };
  const tipo = MAPA_GOAL[goal];

  // Fallback: goal não veio da API ou ainda não está mapeado
  // Ordem de prioridade: mensagens > compras > tráfego > engajamento > impressões
  if (!tipo) {
    const leads = ga("onsite_conversion.messaging_conversation_started_7d");
    const tc    = ga("onsite_conversion.total_messaging_connection");
    const pur   = ga("purchase");
    const lc    = ga("link_click");
    const eng   = ga("post_engagement");
    if (leads > 0 || tc > 0) return { label: "Conversas Iniciadas", valor: parseInt(leads || tc), bloco: "MESSAGES"   };
    if (pur > 0)             return { label: "Compras",             valor: parseInt(pur),          bloco: "SALES"      };
    if (lc > 0)              return { label: "Cliques no Link",     valor: parseInt(lc),           bloco: "TRAFFIC"    };
    if (eng > 0)             return { label: "Engajamento",         valor: parseInt(eng),          bloco: "ENGAGEMENT" };
    return { label: "Impressões", valor: parseInt(impressions || 0), bloco: "GENERIC" };
  }

  // Campos raiz da API (não existem no array actions)
  if (tipo === "__reach__")       return { label: "Alcance",           valor: parseInt(reach || 0),        bloco: "AWARENESS" };
  if (tipo === "__impressions__") return { label: "Impressões",        valor: parseInt(impressions || 0),  bloco: "GENERIC"   };
  if (tipo === "profile_visit")   return { label: "Cliques no Perfil", valor: parseInt(inlineClicks || 0), bloco: "FOLLOWERS" };

  // Caso padrão: busca valor no array de actions
  const a = actions.find(a => a.action_type === tipo);
  const valor = a ? parseInt(parseFloat(a.value)) : 0;
  const [label, bloco] = LABEL_MAP[tipo] || ["Resultado", "GENERIC"];
  return { label, valor, bloco };
};

// ── Formata data ISO (YYYY-MM-DD) → DD/MM/YYYY
const formatarData = (d) => {
  if (!d || d === "N/A") return "N/A";
  try { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; } catch { return d; }
};

// ── Monta a mensagem WhatsApp conforme o bloco retornado por getMetrica()
// Cada bloco = um tipo de campanha. Nunca há divergência entre 🎯 e as métricas abaixo.
const buildMensagem = (c, ctr, cpc, cpm, cpr, freq, m) => {
  const di = formatarData(c.data_inicio);
  const df = formatarData(c.data_fim);

  let msg = `📣 *${c.campaign_name}*\n`;
  msg += `📅 ${di} → ${df}\n`;
  msg += `━━━━━━━━━━━━━━━━━\n`;
  msg += `🎯 *Resultado:* ${m.valor} ${m.label}\n`;
  msg += `💸 *Investimento:* R$ ${c.spend.toFixed(2)}\n`;

  if (cpr !== "R$ 0" && m.bloco !== "AWARENESS") {
    msg += `💰 Custo por resultado: ${cpr}\n`;
  }

  if (m.bloco === "MESSAGES") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `💬 Conversas iniciadas: ${parseInt(c.leads)}\n`;
    msg += `🔗 Total conexões: ${parseInt(c.total_conexoes)}\n`;

  } else if (m.bloco === "LEADS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 Leads gerados: ${m.valor}\n`;
    msg += `👆 Cliques no link: ${parseInt(c.cliques_link)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;

  } else if (m.bloco === "SALES") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 Compras: ${m.valor}\n`;
    msg += `👆 Cliques no link: ${parseInt(c.cliques_link)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `🖱️ CPC: ${cpc}\n`;

  } else if (m.bloco === "FOLLOWERS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👆 Cliques no perfil: ${m.valor}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;

  } else if (m.bloco === "TRAFFIC") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👆 Cliques no link: ${m.valor}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `🖱️ CPC: ${cpc}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;

  } else if (m.bloco === "AWARENESS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `🔁 Frequência: ${freq}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
    msg += `💰 CPM: ${cpm}\n`;

  } else if (m.bloco === "ENGAGEMENT" || m.bloco === "VIDEO") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 Engajamento: ${parseInt(c.eng_post)}\n`;
    msg += `🎥 Views de vídeo: ${parseInt(c.video_views)}\n`;
    msg += `👍 Reações: ${parseInt(c.reacoes)}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;

  } else {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `💰 CPM: ${cpm}\n`;
  }

  return msg;
};

// ════════════════ AGRUPAMENTO POR campaign_id ════════════════
for (const item of items) {
  const dataArray = item.json?.data
    ? (Array.isArray(item.json.data) ? item.json.data : [item.json.data])
    : [item.json];

  for (const d of dataArray) {
    const id = d.campaign_id;
    if (!id) continue;

    if (!campanhas[id]) {
      campanhas[id] = {
        campaign_name:     d.campaign_name     || "N/A",
        account_name:      d.account_name      || "N/A",
        data_inicio:       d.date_start        || "N/A",
        data_fim:          d.date_stop         || "N/A",
        optimization_goal: d.optimization_goal || null,
        impressoes: 0, alcance: 0, cliques: 0, cliques_link: 0, spend: 0,
        video_views: 0, reacoes: 0, eng_post: 0, eng_pagina: 0,
        leads: 0, total_conexoes: 0, profile_visit: 0, purchases: 0,
        _acc: {},  // acumula todos os action_types dinamicamente (escalável)
      };
    }

    const c = campanhas[id];
    const actions = d.actions || [];

    // Acumulação genérica — qualquer action_type novo da API é capturado automaticamente
    actions.forEach(a => {
      c._acc[a.action_type] = (c._acc[a.action_type] || 0) + parseFloat(a.value);
    });

    const ga = (t) => { const a = actions.find(a => a.action_type === t); return a ? parseFloat(a.value) : 0; };

    c.impressoes     += parseInt(d.impressions        || "0", 10);
    c.alcance        += parseInt(d.reach              || "0", 10);
    c.cliques        += parseInt(d.clicks             || "0", 10);
    c.cliques_link   += parseInt(d.inline_link_clicks || "0", 10);
    c.spend          += parseFloat(d.spend            || "0");
    c.video_views    += ga("video_view");
    c.reacoes        += ga("post_reaction");
    c.eng_post       += ga("post_engagement");
    c.eng_pagina     += ga("page_engagement");
    c.leads          += ga("onsite_conversion.messaging_conversation_started_7d");
    c.total_conexoes += ga("onsite_conversion.total_messaging_connection");
    c.profile_visit  += parseInt(d.inline_link_clicks || "0", 10); // proxy — ver nota em MAPA_GOAL
    c.purchases      += ga("purchase");

    // Preserva o primeiro optimization_goal válido encontrado entre os ad sets
    if (d.optimization_goal && !c.optimization_goal)
      c.optimization_goal = d.optimization_goal;
  }
}

// ════════════════ MONTAGEM DO OUTPUT ════════════════
const resultado = [];

for (const id of Object.keys(campanhas)) {
  const c = campanhas[id];

  // Reconstrói lista de actions a partir do acumulador genérico
  const actList = Object.entries(c._acc)
    .map(([k, v]) => ({ action_type: k, value: String(v) }));

  // KPIs do período completo
  const ctr  = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(2) + "%" : "0%";
  const cpc  = c.cliques    > 0 ? "R$ " + (c.spend / c.cliques).toFixed(2)             : "R$ 0";
  const freq = c.alcance    > 0 ? (c.impressoes / c.alcance).toFixed(2)                : "0";
  const cpm  = c.impressoes > 0 ? "R$ " + ((c.spend / c.impressoes) * 1000).toFixed(2) : "R$ 0";

  const m   = getMetrica(c.optimization_goal, c.impressoes, c.alcance, c.cliques_link, actList);
  const cpr = m.valor > 0 ? "R$ " + (c.spend / m.valor).toFixed(2) : "R$ 0";

  resultado.push({ json: {
    mensagem:        buildMensagem(c, ctr, cpc, cpm, cpr, freq, m),
    campaign_name:   c.campaign_name,
    account_name:    c.account_name,
    data_inicio:     c.data_inicio,
    data_fim:        c.data_fim,
    resultado_label: m.label,
    resultado_valor: m.valor.toString(),
    investimento:    "R$ " + c.spend.toFixed(2),
    cpr,
    impressoes:      c.impressoes.toString(),
    alcance:         c.alcance.toString(),
    cliques:         c.cliques.toString(),
    cliques_link:    c.cliques_link.toString(),
    ctr, cpc, cpm,
    video_views:     c.video_views.toString(),
    reacoes:         c.reacoes.toString(),
    eng_post:        c.eng_post.toString(),
    leads:           c.leads.toString(),
    total_conexoes:  c.total_conexoes.toString(),
  }});
}

return resultado;
