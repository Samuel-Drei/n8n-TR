const insight = $json.data[0];

// Verifica se insight é um objeto e pega a array de métricas de ações
let metricasArray = [];
if (Array.isArray(insight)) {
    metricasArray = insight;
    } else if (typeof insight === 'object' && insight !== null) {
        metricasArray = Object.values(insight).find(val => Array.isArray(val)) || [];
    }


// Calculando métricas derivadas
const impressoes = parseInt(insight.impressions || "0", 10);
const cliques = parseInt(insight.clicks || "0", 10);
const investimento = parseFloat(insight.spend || "0");
const alcance = parseInt(insight.reach || "0", 10);
const frequencia = impressoes && alcance ? (impressoes / alcance).toFixed(2) : "0";
const ctr = impressoes ? ((cliques / impressoes) * 100).toFixed(2) : "0"; // CTR em porcentagem
const cpc = cliques ? (investimento / cliques).toFixed(2) : "0"; // Custo por clique

// Extraindo métricas específicas das ações
const metricas = metricasArray.reduce((acc, item) => {
  switch (item.action_type) {
    case "onsite_conversion.messaging_user_depth_3_message_send":
      acc["Envio de Mensagem (Profundidade 3)"] = item.value;
      break;
    case "onsite_conversion.messaging_first_reply":
      acc["Primeira Resposta em Mensagem"] = item.value;
      break;
    case "onsite_conversion.messaging_user_depth_2_message_send":
      acc["Envio de Mensagem (Profundidade 2)"] = item.value;
      break;
    case "onsite_conversion.messaging_conversation_started_7d":
      acc["Conversa Iniciada (7 dias)"] = item.value;
      break;
    case "onsite_conversion.total_messaging_connection":
      acc["Total de Conexões de Mensagens"] = item.value;
      break;
    case "video_view":
      acc["Visualizações de Vídeo"] = item.value;
      break;
    case "post_reaction":
      acc["Reações ao Post"] = item.value;
      break;
    case "link_click":
      acc["Cliques no Link"] = item.value;
      break;
    case "onsite_conversion.post_save":
      acc["Posts Salvos"] = item.value;
      break;
    case "page_engagement":
      acc["Engajamento na Página"] = item.value;
      break;
    case "post_engagement":
      acc["Engajamento no Post"] = item.value;
      break;
    default:
      acc["Desconhecido"] = item.value;
  }
  return acc;
}, {});

// Adicionando métricas específicas que podem vir de actions ou serem calculadas
const cliquesNoLink = metricas["Cliques no Link"] || "0";
const leads = metricas["Conversa Iniciada (7 dias)"] || "0"; // Assumindo como leads, ajustar se houver métrica específica
const totalConexoesMensagens = metricas["Total de Conexões de Mensagens"] || "0";
const initiateCheckout = insight.actions?.find(a => a.action_type === "initiate_checkout")?.value || "0";
const purchases = insight.actions?.find(a => a.action_type === "purchase")?.value || "0";
const valorConversao = insight.conversion_values?.find(cv => cv.action_type === "purchase")?.value || "0";
const roas = investimento ? (parseFloat(valorConversao) / investimento).toFixed(2) : "0";
const custoPorLead = leads && parseInt(leads) ? (investimento / parseInt(leads)).toFixed(2) : "0";
const custoPorInitiateCheckout = initiateCheckout && parseInt(initiateCheckout) ? (investimento / parseInt(initiateCheckout)).toFixed(2) : "0";
const custoPorCompra = purchases && parseInt(purchases) ? (investimento / parseInt(purchases)).toFixed(2) : "0";

// Montando o objeto organizado
const dadosOrganizados = {
  "data_inicio": insight.date_start || "N/A",
  "data_fim": insight.date_stop || "N/A",
  "nome_conta_anuncio": insight.account_name || "N/A",
  "alcance": alcance.toString(),
  "ctr": ctr + "%",
  "cliques_no_link": cliquesNoLink,
  "view_page_destino": insight.landing_page_views || "0",
  "cpc": cpc,
  "leads_cadastrados": leads,
  "initiate_checkout": initiateCheckout,
  "purchase": purchases,
  "custo_por_finalizacao_compra": custoPorCompra,
  "custo_por_lead": custoPorLead,
  "custo_por_initiate_checkout": custoPorInitiateCheckout,
  "qtd_compras": purchases,
  "valor_conversao": valorConversao,
  "roas": roas,
  "gasto_investimento": investimento.toFixed(2),
  "frequencia": frequencia,
  "impressoes": impressoes.toString(),
  "cliques": cliques.toString(),
  "total_conexoes_mensagens": totalConexoesMensagens, // Adicionado aqui como métrica principal
  "metricas_adicionais": metricas // Mantém todas as métricas de ações como extra
};

$input.item.json.insightsFormatados = dadosOrganizados;

return $input.item;