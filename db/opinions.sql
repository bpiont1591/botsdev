-- SQL do utworzenia tabeli opinii + testowy wpis
CREATE TABLE IF NOT EXISTS opinions (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO opinions (id, author, rating, content, created_at)
VALUES (
  'seed-1',
  'Testowy użytkownik',
  5,
  'Bot działa bardzo dobrze, panel ticketów jest czytelny i szybki.',
  '2026-03-08T14:00:00.000Z'
);
