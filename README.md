# Strona WWW do Twojego bota Discord (status + licznik + kontakt)

## Co to robi
- Pokazuje **czy bot jest online**
- Pokazuje **liczbę członków** na serwerze (guild)
- Pokazuje **ping** i **uptime**
- Ma **formularz kontaktowy** wysyłający wiadomość na **Discord webhook**
- Styl: **czarno-biały, minimalistyczny, z lekkim „premium” vibe**

## Wymagania
- Node.js 18+ (bo używamy `fetch` po stronie serwera)
- Bot musi być na Twoim serwerze i mieć włączony intent **Server Members Intent** (jeśli chcesz zawsze aktualny `memberCount`)

## Instalacja
1) Wejdź do folderu `server`
```bash
cd server
npm i
```

2) Skonfiguruj `.env`
Utwórz plik `server/.env` na podstawie przykładu poniżej.

3) Uruchom
```bash
npm run start
```

Strona będzie na: `http://localhost:3000`

## Przykład server/.env
```env
PORT=3000
DISCORD_TOKEN=TU_WKLEJ_TOKEN_BOTA
GUILD_ID=ID_TWOJEGO_SERWERA
# opcjonalne — do kontaktu
CONTACT_WEBHOOK_URL=TU_WKLEJ_WEBHOOK_Z_KANAŁU
```

## Skąd wziąć GUILD_ID
- Włącz „Developer Mode” na Discordzie → prawy klik na serwer → **Copy Server ID**.

## Skąd wziąć CONTACT_WEBHOOK_URL
- Kanał tekstowy → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL.

## Deployment (skrót)
- VPS / Railway / Render / Fly.io / własny serwer: to zwykły Express.
- Pamiętaj, żeby dodać zmienne środowiskowe (token, guild id, webhook).

## Jeśli chcesz spiąć to z Twoim już działającym botem
Masz dwie opcje:
1) **Najprościej**: uruchamiasz tę stronę jako osobny proces z tym samym tokenem (działa, ale token używany w 2 miejscach).
2) **Czyściej**: w swoim bocie wystawiasz endpoint `/api/status`, a frontend zostaje taki sam.

Jeśli chcesz, mogę dopasować wariant (2) pod Twoje aktualne pliki bota — tylko podeślij projekt w ZIP (RAR tutaj nie rozpakuję w tym środowisku).
