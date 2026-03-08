# Discord bot (modułowy)

## Szybki start
1. Zainstaluj zależności:
```bash
npm i
```
2. Skopiuj `.env.example` do `.env` i uzupełnij wartości.
3. Uruchom bota:
```bash
npm start
```
4. Zarejestruj slash-komendy:
```bash
node deploy-commands.js
```

## Konfiguracja
- Sekrety (token) trzymaj tylko w `.env`.
- Stałe ID możesz trzymać w `.env` lub `settings.json` / `channels.json`.
- Centralna konfiguracja jest w `config/appConfig.js`.

## Struktura
- `commands/` — komendy slash
- `events/` — eventy Discord
- `lib/jsonStore.js` — bezpieczny odczyt i zapis JSON (atomiczny)
- `config/appConfig.js` — scentralizowany config
