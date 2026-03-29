const items = $input.all();

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

const LABEL_MAP = {
  "onsite_conversion.messaging_conversation_started_7d": ["Conversas Iniciadas", "MESSAGES"],
  "link_click":        ["Cliques no Link",    "TRAFFIC"],
  "landing_page_view": ["Visitas na Página",  "TRAFFIC"],
  "lead":              ["Leads",              "LEADS"],
  "post_engagement":   ["Engajamento",        "ENGAGEMENT"],
  "video_view":        ["Views de Vídeo",     "VIDEO"],
  "like":              ["Curtidas na Página", "ENGAGEMENT"],
  "purchase":          ["Compras",            "SALES"],
  "profile_visit":     ["Visitas ao Perfil",  "FOLLOWERS"],
};

const getMetrica = (goal, impressions, reach, inlineClicks, actions) => {
  const ga   = (t) => { const a = actions.find(a => a.action_type === t); return a ? parseFloat(a.value) : 0; };
  const tipo = MAPA_GOAL[goal];
  if (!tipo) {
    const leads = ga("onsite_conversion.messaging_conversation_started_7d");
    const tc    = ga("onsite_conversion.total_messaging_connection");
    const pur   = ga("purchase"),  pv  = ga("profile_visit");
    const lc    = ga("link_click"), eng = ga("post_engagement"), alc = parseInt(reach || 0);
    if (leads > 0 || tc > 0) return { label: "Conversas Iniciadas", valor: parseInt(leads || tc), bloco: "MESSAGES"   };
    if (pur > 0)             return { label: "Compras",             valor: parseInt(pur),          bloco: "SALES"      };
    if (pv > 0)              return { label: "Visitas ao Perfil",   valor: parseInt(pv),           bloco: "FOLLOWERS"  };
    if (lc > 0)              return { label: "Cliques no Link",     valor: parseInt(lc),           bloco: "TRAFFIC"    };
    if (alc > 0 && eng > 0 && (eng / alc) < 0.05)
                             return { label: "Alcance",             valor: alc,                    bloco: "AWARENESS"  };
    if (eng > 0)             return { label: "Engajamento",         valor: parseInt(eng),          bloco: "ENGAGEMENT" };
    return { label: "Impressões", valor: parseInt(impressions || 0), bloco: "GENERIC" };
  }
  if (tipo === "__reach__")       return { label: "Alcance",          valor: parseInt(reach || 0),       bloco: "AWARENESS" };
  if (tipo === "__impressions__") return { label: "Impressões",       valor: parseInt(impressions || 0), bloco: "GENERIC"   };
  if (tipo === "profile_visit") {
    const pvVal = ga("profile_visit");
    const val   = pvVal > 0 ? parseInt(pvVal) : parseInt(inlineClicks || 0);
    return { label: "Visitas ao Perfil", valor: val, bloco: "FOLLOWERS" };
  }
  const a = actions.find(a => a.action_type === tipo);
  const valor = a ? parseInt(parseFloat(a.value)) : 0;
  const [label, bloco] = LABEL_MAP[tipo] || ["Resultado", "GENERIC"];
  return { label, valor, bloco };
};

const getAdValor = (goal, ad) => {
  const actions = ad._actions || [];
  const ga      = (t) => { const a = actions.find(a => a.action_type === t); return a ? parseFloat(a.value) : 0; };
  const tipo    = MAPA_GOAL[goal];
  if (!tipo)              return ga("onsite_conversion.messaging_conversation_started_7d") || ga("post_engagement");
  if (tipo === "__reach__")       return ad._reach || 0;
  if (tipo === "__impressions__") return ad._impressoes || 0;
  if (tipo === "profile_visit") { const pv = ga("profile_visit"); return pv > 0 ? parseInt(pv) : (ad._ilc || 0); }
  const a = actions.find(a => a.action_type === tipo);
  return a ? parseInt(parseFloat(a.value)) : 0;
};

const getAdLabel = (goal) => {
  const tipo = MAPA_GOAL[goal];
  if (!tipo)                      return "resultados";
  if (tipo === "__reach__")       return "alcance";
  if (tipo === "__impressions__") return "impressões";
  if (tipo === "profile_visit")   return "visitas ao perfil";
  const entry = LABEL_MAP[tipo];
  return entry ? entry[0].toLowerCase() : "resultados";
};

const formatarData = (d) => {
  if (!d || d === "N/A") return "N/A";
  try { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; } catch { return d; }
};

const buildMensagem = (c, ctr, cpc, cpm, cpr, freq, m) => {
  const di    = formatarData(c.data_inicio);
  const df    = formatarData(c.data_fim);
  const bloco = m.bloco;

  let msg = `📣 *${c.campaign_name}*\n`;
  msg += `📅 ${di} → ${df}\n`;
  msg += `━━━━━━━━━━━━━━━━━\n`;
  msg += `🎯 *Resultado:* ${m.valor} ${m.label}\n`;
  msg += `💸 *Investimento:* R$ ${c.spend.toFixed(2)}\n`;
  if (cpr !== "R$ 0" && bloco !== "AWARENESS") msg += `💰 Custo por resultado: ${cpr}\n`;

  if (bloco === "MESSAGES") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `💬 Conversas: ${parseInt(c.leads)}\n`;
    msg += `🔗 Total conexões: ${parseInt(c.total_conexoes)}\n`;
  } else if (bloco === "FOLLOWERS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Visitas ao perfil: ${m.valor}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
  } else if (bloco === "AWARENESS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `🔁 Frequência: ${freq}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
    msg += `💰 CPM: ${cpm}\n`;
  } else if (bloco === "ENGAGEMENT" || bloco === "VIDEO") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 Engajamento: ${parseInt(c.eng_post)}\n`;
    msg += `🎥 Views de vídeo: ${parseInt(c.video_views)}\n`;
    msg += `👍 Reações: ${parseInt(c.reacoes)}\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
  } else if (bloco === "TRAFFIC" || bloco === "LEADS") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👆 Cliques: ${parseInt(c.cliques_link)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `🖱️ CPC: ${cpc}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
  } else if (bloco === "SALES") {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 Compras: ${m.valor}\n`;
    msg += `👆 Cliques: ${parseInt(c.cliques_link)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `🖱️ CPC: ${cpc}\n`;
  } else {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `👁️ Impressões: ${parseInt(c.impressoes)}\n`;
    msg += `🌍 Alcance: ${parseInt(c.alcance)}\n`;
    msg += `📈 CTR: ${ctr}\n`;
    msg += `💰 CPM: ${cpm}\n`;
  }

  const goal    = c.optimization_goal;
  const adLabel = getAdLabel(goal);
  const ativos  = Object.values(c.anuncios)
    .filter(a => !a.paused)
    .sort((a, b) => b.valor_principal - a.valor_principal);
  const pausados = Object.values(c.anuncios).filter(a => a.paused);

  if (ativos.length) {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `✅ *Anúncios ativos:*\n`;
    for (const a of ativos) {
      const nome = a.name.length > 35 ? a.name.substring(0, 35) + "…" : a.name;
      msg += `• ${nome} → ${parseInt(a.valor_principal)} ${adLabel}\n`;
    }
  }
  if (pausados.length) {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `⚠️ *Pausados:*\n`;
    for (const a of pausados) {
      const nome = a.name.length > 35 ? a.name.substring(0, 35) + "…" : a.name;
      msg += `• ${nome}\n`;
    }
  }
  return msg;
};

// ── Inputs: [0] Insights (nível ad), [1] Status dos ads
const insightsRaw = items[0]?.json?.data || [];
const statusRaw   = items[1]?.json?.data || [];

const statusMap = {};
for (const ad of statusRaw) {
  statusMap[ad.id] = {
    name:          ad.name,
    status:        ad.effective_status || ad.status || "UNKNOWN",
    campaign_name: ad.campaign ? ad.campaign.name : (ad.campaign_name || "N/A"),
  };
}

const campanhas = {};

for (const d of insightsRaw) {
  const cid = d.campaign_id;
  const aid = d.ad_id;
  if (!cid) continue;

  if (!campanhas[cid]) {
    campanhas[cid] = {
      campaign_name:     d.campaign_name     || "N/A",
      account_name:      d.account_name      || "N/A",
      data_inicio:       d.date_start        || "N/A",
      data_fim:          d.date_stop         || "N/A",
      optimization_goal: d.optimization_goal || null,
      impressoes: 0, alcance: 0, cliques: 0, cliques_link: 0, spend: 0,
      video_views: 0, reacoes: 0, eng_post: 0, eng_pagina: 0,
      leads: 0, total_conexoes: 0, profile_visit: 0, purchases: 0,
      _acc: {}, anuncios: {},
    };
  }

  const c = campanhas[cid];
  const actions = d.actions || [];
  actions.forEach(a => { c._acc[a.action_type] = (c._acc[a.action_type] || 0) + parseFloat(a.value); });

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
  c.profile_visit  += ga("profile_visit");
  c.purchases      += ga("purchase");
  if (d.optimization_goal && !c.optimization_goal) c.optimization_goal = d.optimization_goal;

  if (aid) {
    if (!c.anuncios[aid]) {
      c.anuncios[aid] = {
        name: d.ad_name || statusMap[aid]?.name || "N/A",
        valor_principal: 0, spend: 0,
        _actions: [], _ilc: 0, _reach: 0, _impressoes: 0,
        alcance: 0, impressoes: 0, cliques_link: 0, paused: false,
      };
    }
    const ad = c.anuncios[aid];
    ad.spend       += parseFloat(d.spend || "0");
    ad._ilc        += parseInt(d.inline_link_clicks || "0", 10);
    ad._reach      += parseInt(d.reach || "0", 10);
    ad._impressoes += parseInt(d.impressions || "0", 10);
    ad.alcance      = ad._reach;
    ad.impressoes   = ad._impressoes;
    ad.cliques_link = ad._ilc;
    for (const a of actions) {
      const ex = ad._actions.find(x => x.action_type === a.action_type);
      if (ex) ex.value = String(parseFloat(ex.value) + parseFloat(a.value));
      else    ad._actions.push({ action_type: a.action_type, value: a.value });
    }
  }
}

// Recalcula valor_principal após acumular todos os adsets
for (const cid of Object.keys(campanhas)) {
  const c = campanhas[cid];
  for (const ad of Object.values(c.anuncios)) {
    ad.valor_principal = getAdValor(c.optimization_goal, ad);
  }
}

// Adiciona pausados sem gasto (vêm apenas do status)
for (const [aid, adInfo] of Object.entries(statusMap)) {
  if (["PAUSED","CAMPAIGN_PAUSED","ADSET_PAUSED"].includes(adInfo.status)) {
    for (const cid of Object.keys(campanhas)) {
      if (campanhas[cid].campaign_name === adInfo.campaign_name && !campanhas[cid].anuncios[aid]) {
        campanhas[cid].anuncios[aid] = {
          name: adInfo.name, valor_principal: 0, spend: 0,
          _actions: [], _ilc: 0, _reach: 0, _impressoes: 0,
          alcance: 0, impressoes: 0, cliques_link: 0, paused: true,
        };
      }
    }
  }
}

const resultado = [];
for (const cid of Object.keys(campanhas)) {
  const c = campanhas[cid];
  const actList = Object.entries(c._acc).map(([k, v]) => ({ action_type: k, value: String(v) }));

  const ctr  = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(2) + "%" : "0%";
  const cpc  = c.cliques    > 0 ? "R$ " + (c.spend / c.cliques).toFixed(2)            : "R$ 0";
  const freq = c.alcance    > 0 ? (c.impressoes / c.alcance).toFixed(2)               : "0";
  const cpm  = c.impressoes > 0 ? "R$ " + ((c.spend / c.impressoes) * 1000).toFixed(2): "R$ 0";

  const m   = getMetrica(c.optimization_goal, c.impressoes, c.alcance, c.cliques_link, actList);
  const cpr = m.valor > 0 ? "R$ " + (c.spend / m.valor).toFixed(2) : "R$ 0";

  resultado.push({ json: {
    mensagem:        buildMensagem(c, ctr, cpc, cpm, cpr, freq, m),
    campaign_name:   c.campaign_name,
    resultado_label: m.label,
    resultado_valor: m.valor.toString(),
    investimento:    "R$ " + c.spend.toFixed(2),
    cpr,
  }});
}
return resultado;
