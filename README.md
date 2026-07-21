# UMAYv2

English Time İzmit ve Körfez operasyonları için geliştirilen rol bazlı CRM ve fiyatlandırma uygulaması.

## Mevcut kapsam

- Yönetici merkezi ve aday yönetimi
- Teklif merkezi
- Eğitim tipleri, kampanyalar ve fiyatlar
- Kredi kartı tarifeleri ve senet kuralları
- Merkezi AppDeploy veri katmanı
- Gerçek zamanlı senkronizasyon
- Taşınabilir JSON veri dışa aktarma

## Mimari

React, TypeScript, Vite ve Tailwind CSS ön yüzü ile AppDeploy arka ucu kullanılır. Veri sağlayıcısı ekranlardan ayrılmıştır. Gelecekte Render, Replit veya PostgreSQL tabanlı başka bir altyapıya geçiş için `docs/DATA_PORTABILITY.md` belgesine bakın.

## Canlı uygulama

https://459b0bc8eff1b288e3.v2.appdeploy.ai/

## Güvenlik

Gizli anahtarlar ve gerçek üretim kimlik bilgileri kaynak koduna eklenmemelidir.
