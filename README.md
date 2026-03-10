# Discord bot + strona opinii

## Szybki start (bot)
1. Zainstaluj zależności:
```bash
npm i
```
2. Skopiuj `.env.example` do `.env` i uzupełnij wartości.
3. Uruchom bota:
```bash
npm start
```

## Strona opinii (web)
Uruchom lokalny serwer strony opinii:
```bash
npm run start:web
```

Strona będzie dostępna pod adresem:
- `http://localhost:3000`

### Co działa
- wyświetlanie opinii z bazy plikowej `data/opinions.json`
- testowa opinia widoczna od razu po starcie
- formularz dodawania opinii z zapisem do bazy i odświeżeniem listy

## SQL do klasycznej bazy
Jeśli chcesz użyć relacyjnej bazy (np. SQLite/Postgres), gotowy skrypt masz w:
- `db/opinions.sql`

## Struktura
- `commands/` — komendy slash
- `events/` — eventy Discord
- `lib/jsonStore.js` — bezpieczny odczyt i zapis JSON (atomiczny)
- `lib/loadEnv.js` — proste ładowanie `.env`
- `config/appConfig.js` — scentralizowany config
- `web/opinionsServer.js` — backend HTTP dla opinii
- `web/public/` — frontend strony opinii
