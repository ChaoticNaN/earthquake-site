const OpenAI = require('openai');

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const FALLBACK_MODEL = 'deepseek-chat';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: DEEPSEEK_BASE_URL
});

function buildPrompt(quakeInfo = {}) {
  const {
    mag = 0,
    place = 'Unknown location',
    depth = 0,
    time = 0,
    lat = 0,
    lng = 0
  } = quakeInfo;

  const timeText = Number.isFinite(Number(time))
    ? new Date(Number(time)).toLocaleString('zh-CN', { hour12: false })
    : 'Unknown time';

  return `Please write a Chinese popular-science interpretation for this earthquake.
You must output exactly four sections and strictly follow the section titles and order below:
1) 基本概况：
2) 科学解读：
3) 地震破坏：
4) 相关新闻报道：

Earthquake data:
- Magnitude: M${Number(mag).toFixed(1)}
- Place: ${place}
- Depth: ${Number(depth).toFixed(1)} km
- Time: ${timeText}
- Coordinates: lat ${Number(lat).toFixed(4)}, lng ${Number(lng).toFixed(4)}

Output constraints:
- Output in Chinese
- Keep tone accurate, clear, and non-alarmist.
- In “科学解读：”, you must include:
  a) regional geological background (plate boundary setting and fault type)
  b) a brief comparison with historical similar earthquakes in that region (magnitude/depth/damage level).
- In “地震破坏：”, describe likely damage types and impact scope, e.g. building damage, ground fissures, landslides, tsunami and affected area range.
- In “相关新闻报道：”, provide 2 real and verifiable reports when possible, each in this format:
  新闻标题 | 媒体 | 日期(YYYY-MM-DD) | URL
  新闻标题 | 媒体 | 日期(YYYY-MM-DD) | URL
- Never fabricate sources. If you cannot verify real reports, write exactly:
  暂无可核实的相关新闻报道
- Do not stop mid-sentence. Please output complete content without truncation.`;
}

async function requestSummaryByModel(model, quakeInfo, maxTokens = 1200) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.5,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'system',
        content:
          'You are an earthquake science communicator. Provide structured, factual Chinese explanations, and never fabricate news links or media names.'
      },
      {
        role: 'user',
        content: buildPrompt(quakeInfo)
      }
    ]
  });

  const finishReason = completion?.choices?.[0]?.finish_reason || '';
  const text = completion?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('AI response is empty');
  return { text, finishReason };
}

async function generateEarthquakeSummary(quakeInfo) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }

  const configuredModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  try {
    const firstTry = await requestSummaryByModel(configuredModel, quakeInfo, 1200);
    if (firstTry.finishReason === 'length') {
      const retryTry = await requestSummaryByModel(configuredModel, quakeInfo, 1500);
      return retryTry.text;
    }
    return firstTry.text;
  } catch (error) {
    if (configuredModel === FALLBACK_MODEL) throw error;
    console.warn(
      `[aiService] model "${configuredModel}" failed, fallback to "${FALLBACK_MODEL}": ${error?.message || error}`
    );
    const fallbackTry = await requestSummaryByModel(FALLBACK_MODEL, quakeInfo, 1200);
    if (fallbackTry.finishReason === 'length') {
      const fallbackRetry = await requestSummaryByModel(FALLBACK_MODEL, quakeInfo, 1500);
      return fallbackRetry.text;
    }
    return fallbackTry.text;
  }
}

module.exports = {
  generateEarthquakeSummary
};
