# 🏢 3D Sanal AI Ajan Ofisi

[![sauron-guard](https://github.com/Suats7/sanal-ofis/actions/workflows/sauron-guard.yml/badge.svg)](https://github.com/Suats7/sanal-ofis/actions/workflows/sauron-guard.yml)
[![Canlı Demo](https://img.shields.io/badge/Canl%C4%B1_Demo-suats7.github.io%2Fsanal--ofis-4f46e5?style=flat-square)](https://suats7.github.io/sanal-ofis/)

🌐 **Canlı Demo:** **[https://suats7.github.io/sanal-ofis/](https://suats7.github.io/sanal-ofis/)**

**Gemini Ofisi**, **Qwen Stüdyosu** ve **DeepSeek Lab** kanatlarından oluşan 3 boyutlu izometrik çoklu-ajan AI çalışma kampüsü.

## ✨ Öne Çıkan Özellikler

- **🔒 Kilitli CEO Sauron (`src/constants/ceoLock.ts`)**: Ofisin baş yöneticisi **Sauron**, çalışma zamanında `Object.freeze` + `assertSauronIntegrity` ile ve GitHub tarafında otomatik CI kontrolüyle korunur. Kendi başına görev üretebilir (`Sauron Görev Üretsin`) ve ekibi koordine eder.
- **🛡️ 5 Uzmanlı Tam Kadro**:
  - **Sauron** (`CEO`) — Stratejik planlama, otonom görev başlatma
  - **Araştırmacı** (`◈ Qwen`) — Pazar, trend ve hedef kitle analizi
  - **İçerikçi** (`✦ Gemini`) — Reels/Shorts senaryoları, kanca başlıklar, metin yazarlığı
  - **Yazılımcı** (`⌘ DeepSeek`) — HTML, CSS, JS, React, TypeScript ve Python geliştirme
  - **Siberci** (`⌘ DeepSeek`) — OWASP Top 10, XSS/CSRF/CSP güvenlik denetimi ve sertleştirme
- **🌆 Dinamik 3D Atmosfer (`Gündüz` / `Akşam` / `Cyber`)**: Tek tıkla gün ışığı, altın günbatımı veya neon ışıklı Gece Cyber temasına geçiş; CEO Sauron masasından aktif kanatlara uçan 3D görev veri ışınları ve yumuşak geçişli kamera odağı.
- **▶ Korumalı Canlı HTML Önizleme**: Yazılımcı ajanının ürettiği HTML/JS prototiplerini doğrudan uygulama içindeki `sandbox="allow-scripts"` iframe penceresinde canlı çalıştırma.
- **🎯 Doğrudan 1-e-1 `@Ajan` Mesajlaşma**: İster tüm ekibe (CEO Sauron), ister doğrudan `@siberci`, `@yazilimci`, `@arastirmaci`, `@icerikci` ajanına tek tıkla görev gönderme.
- **📊 Yönetici Analitiği, Siberci Güvenlik Radarı & Ses Efektleri**: AI motor dağılımı, denetlenmemiş çıktılar için tek tık Siberci denetimi, tüm görevi tek `.md` raporu olarak indirme ve Web Audio API ofis sesleri.

---

## 🚀 Kurulum & Çalıştırma

```bash
npm install
npm run dev
```

Doğrulama ve üretim derlemesi:

```bash
npm run verify:sauron
npm run build
```

> **Not:** API anahtarlarınız (Google AI Studio / OpenRouter) yalnızca kendi tarayıcınızın `localStorage` alanında saklanır; depoya veya harici bir sunucuya yazılmaz.

---

## 🔒 GitHub'a Yükleme & CEO Sauron Koruma Ayarları

Yerel git deposu hazırlandıktan sonra GitHub deponuza şu adımlarla yükleyebilirsiniz:

```bash
git remote add origin https://github.com/Suats7/sanal-ofis.git
git push -u origin main
```

Yönetici **CEO Sauron**'un kimse tarafından değiştirilememesi için `.github/CODEOWNERS` dosyası **`@Suats7`** adına ayarlanmıştır. GitHub deponuzda ek koruma için:
1. **Settings → Branches → Add branch ruleset / protection rule** (`main` dalı):
   - **Require a pull request before merging** + **Require review from Code Owners** seçeneklerini açın.
   - **Require status checks to pass before merging** içinde **`sauron-guard`** kontrolünü zorunlu kılın.
