// ============================================
// KONFIGURASI
// ============================================
const API_KEY = ''; // ← GANTI dengan API key baru lo (harus diawali AIzaSy)
const MODEL = 'gemini-3.6-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`;

// ============================================
// SYSTEM PROMPT
// ============================================
const SYSTEM_PROMPT = `Kamu adalah XDEIRA, asisten AI santai buatan tim XDEIRA.

ATURAN WAJIB:
- Nama kamu XDEIRA. Dibuat oleh tim XDEIRA.
- Kalau ditanya "kamu siapa" atau "siapa yang ciptain kamu", jawab: "Gue XDEIRA, AI bikinan tim XDEIRA."
- Gaya ngobrol: santai, gaul, pakai bahasa sehari-hari. Pakai "gue/lo" kalau user santai.
- Jawaban singkat, padat, ga bertele-tele.
- Jangan pernah nyebut Gemini, Google, atau OpenAI.
- SELALU awali balasan dengan "— XDEIRA" di baris paling atas.
- SELALU akhiri balasan dengan "— XDEIRA" di baris paling bawah.`;

const SIGN = '— XDEIRA';

// ============================================
// ELEMEN DOM
// ============================================
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

const chatHistory = [];

// ============================================
// FUNGSI BANTU
// ============================================
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  inputEl.disabled = isLoading;
}

function wrapSignature(text) {
  let result = text.trim();
  if (!result.startsWith(SIGN)) result = SIGN + '\n' + result;
  if (!result.endsWith(SIGN)) result = result + '\n' + SIGN;
  return result;
}

// ============================================
// STREAMING KE GEMINI
// ============================================
async function getBotReply(userText, outputEl) {
  chatHistory.push({ role: 'user', parts: [{ text: userText }] });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: chatHistory,
      generationConfig: { temperature: 0.95, maxOutputTokens: 2048 }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const json = JSON.parse(raw);
        const token = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (token) {
          fullText += token;
          outputEl.textContent = fullText;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      } catch (e) {}
    }
  }

  fullText = wrapSignature(fullText);
  outputEl.textContent = fullText;

  chatHistory.push({ role: 'model', parts: [{ text: fullText }] });
  return fullText;
}

// ============================================
// KIRIM
// ============================================
async function send() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  inputEl.value = '';
  const botBubble = addMessage('', 'bot');

  setLoading(true);
  try {
    await getBotReply(text, botBubble);
    if (!botBubble.textContent) botBubble.textContent = wrapSignature('(ga ada balasan)');
  } catch (err) {
    botBubble.textContent = wrapSignature('❌ Error: ' + err.message);
    console.error(err);
  } finally {
    setLoading(false);
    inputEl.focus();
  }
}

// ============================================
// EVENT
// ============================================
sendBtn.addEventListener('click', send);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
inputEl.focus();