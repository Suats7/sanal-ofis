import { GoogleGenAI } from '@google/genai';
import { AGENTS } from '../constants/agents';
import type { AgentId, AgentProgress, WorkflowPlan, WorkflowPlanStep } from '../types';
import { getAgentLevelInfo } from '../constants/progression';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export interface GeminiModelOption {
  id: string;
  label: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  { id: 'gemini-4-hydrogen', label: 'gemini-4-hydrogen (Varsayılan • Gemini 4 • Ücretsiz Katman)' },
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash (Hızlı & Güncel • Ücretsiz Katman)' },
  { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Ultra Hızlı / Hafif • Ücretsiz Katman)' },
  { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash (Dengeli Flash • Ücretsiz Katman)' },
  { id: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Hafif & Yüksek Kota • Ücretsiz Katman)' },
  { id: 'gemini-4-argon', label: 'gemini-4-argon (Gemini 4 Argon • Ücretli API / Billing)' },
  { id: 'gemini-4-neon', label: 'gemini-4-neon (Gemini 4 Neon • Ücretli API / Billing)' },
  { id: 'gemini-4-carbon', label: 'gemini-4-carbon (Gemini 4 Carbon • En Güçlü • Ücretli API)' },
  { id: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (Pro Önizleme • Ücretli API)' },
];

const RETIRED_MODELS = new Set<string>([
  'gemini-3.1-flash-lite-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
]);

export function isRetiredGeminiModel(model?: string): boolean {
  const cleaned = model?.trim().replace(/^models\//, '').toLowerCase();
  if (!cleaned) return true;
  if (RETIRED_MODELS.has(cleaned)) return true;
  return (
    cleaned.startsWith('gemini-1.5-') ||
    cleaned.startsWith('gemini-2.0-') ||
    cleaned.startsWith('gemini-2.5-')
  );
}

export function normalizeGeminiModel(model?: string): string {
  const cleaned = model?.trim().replace(/^models\//, '');
  if (!cleaned || isRetiredGeminiModel(cleaned)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return cleaned;
}

export function formatGeminiError(err: unknown, model?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('401')) {
    return 'API anahtarı geçersiz görünüyor. Lütfen Google AI Studio anahtarınızı kontrol edip tekrar deneyin.';
  }

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    if (lower.includes('limit: 0') || lower.includes('free_tier')) {
      return `Seçilen model (${model || 'bu model'}) Google AI Studio Ücretsiz (Free Tier) katmanında kapalı (limit: 0). "Hesaptaki Modelleri Getir" ile aktif bir Flash/Hydrogen modeli seçin.`;
    }
    return 'Gemini API dakika/günlük kota sınırına ulaşıldı. Biraz bekleyip tekrar deneyin veya daha yüksek kotalı bir Flash modeli seçin.';
  }

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('overloaded')) {
    return `Seçilen model (${model || 'model'}) şu an Google sunucularında geçici yoğunluk (503) yaşıyor. Birkaç saniye sonra tekrar deneyin veya listeden başka bir Flash/Lite model seçin.`;
  }

  if (lower.includes('404') || lower.includes('not_found')) {
    return `Seçilen model (${model || 'model'}) bu hesap için bulunamadı. "Hesaptaki Modelleri Getir" butonuna tıklayarak hesabınızda aktif modelleri listeleyin.`;
  }

  if (lower.includes('403') || lower.includes('permission_denied')) {
    return 'Bu API anahtarının seçilen modele erişim izni yok. Google AI Studio ayarlarınızı kontrol edin.';
  }

  return raw.length > 260 ? `${raw.slice(0, 260)}...` : raw || 'API bağlantısı kurulamadı.';
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  // @google/genai v3+ defaults to 'v1', while preview models and full Gemini Developer API
  // model listing/generation features are served on 'v1beta'.
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1beta' },
  });
}

export async function fetchAccountGeminiModels(apiKey: string): Promise<GeminiModelOption[]> {
  const ai = createGeminiClient(apiKey);
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const results: GeminiModelOption[] = [];
  const seen = new Set<string>();

  for await (const m of pager) {
    const rawName = m.name ?? '';
    const id = rawName.replace(/^models\//, '').trim();
    if (!id || seen.has(id)) continue;

    const actions = m.supportedActions ?? [];
    const supportsGenerate =
      actions.length === 0 || actions.includes('generateContent');
    if (!supportsGenerate) continue;

    // Keep active text/multimodal chat Gemini models, skip retired/alias & media-only endpoints
    const lower = id.toLowerCase();
    if (!lower.startsWith('gemini-')) continue;
    if (
      isRetiredGeminiModel(lower) ||
      lower === 'gemini-3.7-flash' ||
      lower === 'gemini-3.5-flash' ||
      lower.includes('embedding') ||
      lower.includes('tts') ||
      lower.includes('imagen') ||
      lower.includes('image') ||
      lower.includes('native-audio') ||
      lower.includes('live')
    ) {
      continue;
    }

    seen.add(id);
    const display = m.displayName && m.displayName !== id ? `${id} — ${m.displayName}` : id;
    results.push({ id, label: display });
    if (results.length >= 40) break;
  }

  // Prioritize stable GA Free-Tier models at the top, keeping -preview models below
  const score = (id: string) => {
    const l = id.toLowerCase();
    if (l === 'gemini-4-hydrogen') return 0;
    if (l === 'gemini-3.8-flash') return 1;
    if (l === 'gemini-3.5-flash-lite') return 2;
    if (l === 'gemini-3.6-flash') return 3;
    if (l === 'gemini-3.1-flash-lite') return 4;
    if (l.startsWith('gemini-4-') && !l.includes('preview')) return 5;
    if (l.includes('flash') && !l.includes('preview')) return 6;
    if (l.includes('pro') && !l.includes('preview')) return 7;
    return 8;
  };
  results.sort((a, b) => score(a.id) - score(b.id) || b.id.localeCompare(a.id));

  return results;
}

export function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

export function buildFallbackPlan(userPrompt: string): WorkflowPlan {
  const lower = userPrompt.toLocaleLowerCase('tr-TR');
  const wantsCode =
    /(kod|html|css|js|javascript|typescript|react|python|script|uygulama|web|sayfa|api|fonksiyon|bileşen|component)/i.test(
      lower,
    );
  const wantsContent =
    /(reels|video|senaryo|başlık|metin|sosyal medya|instagram|tiktok|youtube|kampanya|slogan|içerik|blog|post|reklam)/i.test(
      lower,
    );
  const wantsResearch =
    /(araştır|trend|analiz|özet|pazar|bilgi|rakip|hedef kitle|neden|nasıl|rapor|karşılaştır)/i.test(
      lower,
    );
  const wantsSecurity =
    /(güvenlik|siber|açık|xss|sql|hack|savunma|denetim|audit|şifre|auth|koruma|firewall|owasp|kvkk|gizlilik)/i.test(
      lower,
    );

  const steps: WorkflowPlanStep[] = [];

  if (wantsResearch || (!wantsCode && !wantsContent && !wantsSecurity)) {
    steps.push({
      agentId: 'arastirmaci',
      subtask: `Şu görev için temel kavramları, güncel trendleri ve uygulanabilir anahtar bulguları özetle: "${userPrompt}"`,
      reason: 'Ekibin sağlam bilgi ve içgörü temeliyle ilerlemesi için.',
    });
  }
  if (wantsContent || (!wantsCode && !wantsResearch && !wantsSecurity)) {
    steps.push({
      agentId: 'icerikci',
      subtask: `Görev ve mevcut bağlam doğrultusunda yaratıcı metinler, dikkat çekici başlıklar ve senaryo/fikirler üret: "${userPrompt}"`,
      reason: 'Etkileyici ve paylaşılabilir yaratıcı içerik oluşturmak için.',
    });
  }
  if (wantsCode) {
    steps.push({
      agentId: 'yazilimci',
      subtask: `İstenen teknik çözümü temiz, modern ve çalışır kod bloklarıyla oluştur: "${userPrompt}"`,
      reason: 'Doğrudan kullanılabilir teknik çıktı sağlamak için.',
    });
  }
  if (wantsSecurity || wantsCode) {
    steps.push({
      agentId: 'siberci',
      subtask: `Bu görevdeki kod, API, veri akışı ve kullanıcı etkileşimleri için OWASP/XSS/veri sızıntısı risklerini denetle ve sertleştirme kontrol listesi hazırla: "${userPrompt}"`,
      reason: 'İşi şansa bırakmamak ve savunma güvenliğini garantiye almak için.',
    });
  }

  if (steps.length === 0) {
    steps.push(
      {
        agentId: 'arastirmaci',
        subtask: `Konu hakkında kısa trend ve bilgi özeti hazırla: "${userPrompt}"`,
        reason: 'Ön bilgi ve bağlam oluşturmak için.',
      },
      {
        agentId: 'icerikci',
        subtask: `Konuyla ilgili yaratıcı başlıklar ve içerik önerileri geliştir: "${userPrompt}"`,
        reason: 'Uygulanabilir içerik fikirleri sunmak için.',
      },
    );
  }

  return {
    summary: `Görev analiz edildi ve ${steps
      .map((s) => AGENTS[s.agentId].name)
      .join(' → ')} sırasıyla ekibe dağıtıldı.`,
    steps,
  };
}

function isTransientOverload(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

function isModelSwitchableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    isTransientOverload(err) ||
    msg.includes('404') ||
    msg.includes('not_found') ||
    msg.includes('limit: 0') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429')
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateContentResilient(
  apiKey: string,
  primaryModel: string,
  contents: string,
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    temperature?: number;
  },
  extraFallbacks: string[] = [],
): Promise<{ text: string; usedModel: string }> {
  const ai = createGeminiClient(apiKey);
  const firstModel = normalizeGeminiModel(primaryModel);

  const tryCall = async (targetModel: string) => {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      ...(config ? { config } : {}),
    });
    return response.text?.trim() ?? '';
  };

  let lastError: unknown;

  // 1. Try chosen model (with 1 short jittered retry on transient 503)
  try {
    const text = await tryCall(firstModel);
    return { text, usedModel: firstModel };
  } catch (err) {
    lastError = err;
    if (isTransientOverload(err)) {
      await sleep(1300 + Math.floor(Math.random() * 400));
      try {
        const text = await tryCall(firstModel);
        return { text, usedModel: firstModel };
      } catch (retryErr) {
        lastError = retryErr;
      }
    }
    if (!isModelSwitchableError(lastError)) {
      throw lastError;
    }
  }

  // 2. Seamlessly fall back to active GA Free-Tier models if Google server has a 503/429/404 spike
  const candidatePool = [
    ...extraFallbacks,
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
  ].filter(
    (id, idx, arr) =>
      Boolean(id) &&
      id !== firstModel &&
      !isRetiredGeminiModel(id) &&
      arr.indexOf(id) === idx,
  );

  for (const fallbackModel of candidatePool.slice(0, 5)) {
    await sleep(450);
    try {
      const text = await tryCall(fallbackModel);
      return { text, usedModel: fallbackModel };
    } catch (err) {
      lastError = err;
      if (!isModelSwitchableError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export function buildAgentExperienceContext(progress?: AgentProgress): string {
  if (!progress) return '';
  const info = getAgentLevelInfo(progress.xp);
  const memoryBlock =
    progress.memories.length > 0
      ? `\nÖnceki görevlerden edindiğin deneyimler (tutarlılık ve kalite için yararlan):\n${progress.memories
          .slice(0, 5)
          .map((m) => `- ${m}`)
          .join('\n')}`
      : '';
  return `\n\n[Gelişim Durumun: Seviye ${info.level} (${info.title}), ${progress.tasksCompleted} tamamlanmış görev.${memoryBlock}]`;
}

export function parseWorkflowPlanText(text: string, userPrompt: string): WorkflowPlan {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<WorkflowPlan>;
    const validAgents = new Set(['arastirmaci', 'icerikci', 'yazilimci', 'siberci']);
    const seen = new Set<string>();
    const steps: WorkflowPlanStep[] = [];

    if (Array.isArray(parsed.steps)) {
      for (const item of parsed.steps) {
        if (
          item &&
          typeof item.agentId === 'string' &&
          validAgents.has(item.agentId) &&
          !seen.has(item.agentId)
        ) {
          seen.add(item.agentId);
          steps.push({
            agentId: item.agentId as Exclude<AgentId, 'sef'>,
            subtask:
              typeof item.subtask === 'string' && item.subtask.trim()
                ? item.subtask.trim()
                : userPrompt,
            reason:
              typeof item.reason === 'string' && item.reason.trim()
                ? item.reason.trim()
                : 'Görev gereksinimi doğrultusunda atandı.',
          });
        }
      }
    }

    if (steps.length === 0) {
      return buildFallbackPlan(userPrompt);
    }

    return {
      summary:
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : `Görev analiz edildi. Seçilen ekip sırası: ${steps.map((s) => AGENTS[s.agentId].name).join(' → ')}.`,
      steps,
    };
  } catch {
    return buildFallbackPlan(userPrompt);
  }
}

export function buildSpecialistPrompt(
  userPrompt: string,
  subtask: string,
  previousOutputs: { agentId: AgentId; content: string }[],
  agentProgress?: AgentProgress,
): string {
  const contextSection =
    previousOutputs.length > 0
      ? `\n\n### Ekip Arkadaşlarının Önceki Çıktıları:\n${previousOutputs
          .map((item) => `#### ${AGENTS[item.agentId].name} (${AGENTS[item.agentId].shortRole}):\n${item.content}`)
          .join('\n\n')}`
      : '';

  return `### Kullanıcının Ana Görevi:
${userPrompt}

### CEO Sauron'un Sana Verdiği Alt Görev:
${subtask}${contextSection}${buildAgentExperienceContext(agentProgress)}

Lütfen kendi uzmanlık alanına göre en kaliteli, doğrudan kullanılabilir Türkçe çıktıyı Markdown formatında üret.`;
}

export async function planTaskWithChef(
  apiKey: string,
  model: string,
  userPrompt: string,
  chefProgress?: AgentProgress,
): Promise<WorkflowPlan> {
  const { text } = await generateContentResilient(
    apiKey,
    model || DEFAULT_GEMINI_MODEL,
    `Kullanıcı Görevi: ${userPrompt}${buildAgentExperienceContext(chefProgress)}`,
    {
      systemInstruction: AGENTS.sef.systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.35,
    },
  );
  return parseWorkflowPlanText(text, userPrompt);
}

export async function runSpecialistAgent(
  apiKey: string,
  model: string,
  agentId: Exclude<AgentId, 'sef'>,
  userPrompt: string,
  subtask: string,
  previousOutputs: { agentId: AgentId; content: string }[],
  agentProgress?: AgentProgress,
): Promise<string> {
  const agent = AGENTS[agentId];
  const prompt = buildSpecialistPrompt(userPrompt, subtask, previousOutputs, agentProgress);

  const { text } = await generateContentResilient(
    apiKey,
    model || DEFAULT_GEMINI_MODEL,
    prompt,
    {
      systemInstruction: agent.systemPrompt,
      temperature: agentId === 'yazilimci' ? 0.3 : 0.75,
    },
  );

  if (!text) {
    throw new Error(`${agent.name} yanıt üretemedi. Lütfen tekrar deneyin.`);
  }
  return text;
}

export async function testGeminiConnection(
  apiKey: string,
  model: string,
  fallbackModels: string[] = [],
): Promise<{ reply: string; usedModel: string }> {
  const { text, usedModel } = await generateContentResilient(
    apiKey,
    model || DEFAULT_GEMINI_MODEL,
    'Sadece tek cümleyle Türkçe olarak bağlantının başarılı olduğunu yaz.',
    undefined,
    fallbackModels,
  );
  return {
    reply: text || 'Bağlantı başarılı!',
    usedModel,
  };
}

// Kullanıcı API anahtarı girmeden 3D ofis animasyonlarını test etmek isterse Demo Modu
export function generateDemoPlan(userPrompt: string): WorkflowPlan {
  return buildFallbackPlan(userPrompt);
}

export function generateDemoAgentResponse(
  agentId: Exclude<AgentId, 'sef'>,
  userPrompt: string,
): string {
  const shortTopic = userPrompt.length > 80 ? `${userPrompt.slice(0, 77)}...` : userPrompt;

  if (agentId === 'arastirmaci') {
    return `## 🔍 Araştırma & Trend Özeti

**Konu:** ${shortTopic}

### 1. Öne Çıkan Trendler
- **Hızlı Değer Sunumu:** Kullanıcılar ilk 3 saniyede net fayda görmek istiyor.
- **Minimal & Etkileşimli Deneyim:** Karmaşık yapılar yerine sade, mobil uyumlu ve akıcı tasarımlar dönüşümü artırıyor.
- **Topluluk & Hikâye Anlatımı:** Ürünün arkasındaki süreç ve gerçek kullanım senaryoları güven oluşturuyor.

### 2. Hedef Kitle İçgörüleri
| Segment | Öncelikli Beklenti | Önerilen Mesaj |
| --- | --- | --- |
| Genç Profesyoneller | Hız ve pratiklik | "Dakikalar içinde sonuç al" |
| Üreticiler & Girişimciler | Ölçeklenebilirlik | "Fikrini hemen hayata geçir" |

> **Özet Öneri:** İçerik tarafında güçlü bir açılış kancası (hook), teknik tarafta ise sade ve hızlı yüklenen bir arayüz kullanılmalıdır.

*(Demo Modu çıktısıdır — gerçek Gemini / Qwen / DeepSeek yanıtları için Ayarlar sekmesinden API anahtarınızı ekleyin.)*`;
  }

  if (agentId === 'icerikci') {
    return `## 🎬 Yaratıcı İçerik & 30 Saniyelik Reels Senaryosu

**Konu:** ${shortTopic}

### 💡 3 Dikkat Çekici Başlık Önerisi
1. *"Bunu bilmeden saatlerini harcama — işte 30 saniyede en pratik yol!"*
2. *"Herkes aynı hatayı yapıyor: Daha akıllı bir başlangıç için 3 adım"*
3. *"Sıfırdan yayına: Bugün deneyebileceğin modern yaklaşım"*

### 🎥 Reels / Shorts Akışı (30 sn)
- **00–03 sn (Kanca):** Yakın çekim dinamik giriş — *"Hâlâ eski yöntemlerle mi uğraşıyorsun?"* (Ekranda büyük alt yazı)
- **03–15 sn (Sorun & Çözüm):** Hızlı 3 kesit ile temel problemi ve sunduğun yeniliği göster.
- **15–25 sn (Kanıt / Örnek):** Gerçek kullanım anını ve elde edilen sonucu net biçimde vurgula.
- **25–30 sn (CTA):** *"Kaydetmeyi unutma, detaylar ve şablon açıklama kısmında!"*

*(Demo Modu çıktısıdır — gerçek Gemini / Qwen / DeepSeek yanıtları için Ayarlar sekmesinden API anahtarınızı ekleyin.)*`;
  }

  if (agentId === 'siberci') {
    return `## 🛡️ Siber Güvenlik & Savunma Denetimi

**Kapsam:** ${shortTopic}

### 1. Risk & Tehdit Matrisi (OWASP Odaklı)
| Önem | Alan | Olası Risk | Savunma / Çözüm |
| --- | --- | --- | --- |
| **Yüksek** | Girdi & DOM | XSS / güvensiz HTML enjeksiyonu | Tüm kullanıcı girdilerini \`textContent\` veya sanitize ile işle; \`Content-Security-Policy\` ekle |
| **Yüksek** | API & Anahtarlar | İstemci tarafı anahtar sızıntısı | Üretimde sunucu proxy kullan, \`Referrer-Policy\` ve alan adı kısıtlaması uygula |
| **Orta** | İletişim & Veri | Güvensiz depolama / CSRF | Hassas token'ları \`localStorage\` yerine \`HttpOnly\` çerezde tut, HTTPS zorunlu kıl |

### 2. Hızlı Sertleştirme (Hardening) Başlıkları
\`\`\`http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
\`\`\`

### 3. Yayın Öncesi Kontrol Listesi
- [ ] Tüm form ve API parametreleri şema/uzunluk doğrulamasından geçiyor.
- [ ] Hata mesajları sunucu veya yığın (stack trace) detayı sızdırmıyor.
- [ ] Üçüncü parti paketlerde bilinen CVE kontrolü (\`npm audit\`) yapıldı.

*(Demo Modu çıktısıdır — gerçek Gemini / Qwen / DeepSeek güvenlik analizi için Ayarlar sekmesinden API anahtarınızı ekleyin.)*`;
  }

  if (/python|csv|veri analizi/i.test(userPrompt)) {
    return `## 💻 Teknik Çözüm & Python Scripti

**Konu:** ${shortTopic}

Aşağıdaki Python scripti CSV dosyasındaki aylık satışları okuyup özet istatistikler ve görsel çubuk grafik üretir:

\`\`\`python
import csv
from collections import defaultdict

def analiz_et(dosya_yolu: str) -> None:
    aylik_satis = defaultdict(float)

    with open(dosya_yolu, mode="r", encoding="utf-8") as f:
        for satir in csv.DictReader(f):
            aylik_satis[satir["ay"]] += float(satir["tutar"])

    toplam = sum(aylik_satis.values())
    ortalama = toplam / max(len(aylik_satis), 1)
    print(f"Toplam Satış: {toplam:,.2f} TL | Aylık Ortalama: {ortalama:,.2f} TL\\n")

    en_yuksek = max(aylik_satis.values(), default=1)
    for ay, tutar in aylik_satis.items():
        cubuk = "█" * int((tutar / en_yuksek) * 24)
        print(f"{ay:<10} | {cubuk:<24} {tutar:,.2f} TL")

if __name__ == "__main__":
    analiz_et("satislar.csv")
\`\`\`

*(Demo Modu çıktısıdır — gerçek Gemini / Qwen / DeepSeek kod üretimi için Ayarlar sekmesinden API anahtarınızı ekleyin.)*`;
  }

  return `## 💻 Teknik Çözüm & Örnek Kod

**Konu:** ${shortTopic}

Aşağıda doğrudan kopyalayıp tarayıcıda çalıştırabileceğin temiz ve modern bir başlangıç örneği yer alıyor:

\`\`\`html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hızlı Prototip</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
        background: #f5f3ee;
        color: #1e293b;
      }
      .card {
        background: #ffffff;
        padding: 2rem;
        border-radius: 1.25rem;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
        max-width: 420px;
        text-align: center;
      }
      button {
        margin-top: 1rem;
        background: #4f46e5;
        color: #fff;
        border: none;
        padding: 0.75rem 1.25rem;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Projen Hazır!</h1>
      <p>Bu şablon görevine göre özelleştirilmeye hazır temel yapıdır.</p>
      <button onclick="alert('Harika bir başlangıç!')">Hemen Dene</button>
    </main>
  </body>
</html>
\`\`\`

*(Demo Modu çıktısıdır — gerçek Gemini / Qwen / DeepSeek kod üretimi için Ayarlar sekmesinden API anahtarınızı ekleyin.)*`;
}
