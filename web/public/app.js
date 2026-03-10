const list = document.getElementById("opinions");
const form = document.getElementById("opinion-form");
const statusEl = document.getElementById("status");

function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function render(opinions) {
  if (!opinions.length) {
    list.innerHTML = "<p>Brak opinii.</p>";
    return;
  }

  list.innerHTML = opinions
    .map(
      (o) => `
      <article class="opinion">
        <div class="meta">
          <strong>${o.author}</strong>
          <span>${stars(o.rating)}</span>
          <time>${new Date(o.createdAt).toLocaleString("pl-PL")}</time>
        </div>
        <p>${o.content}</p>
      </article>
    `
    )
    .join("");
}

async function loadOpinions() {
  const res = await fetch("/api/opinions");
  const data = await res.json();
  render(data);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Zapisywanie...";

  const formData = new FormData(form);
  const payload = {
    author: formData.get("author"),
    rating: Number(formData.get("rating")),
    content: formData.get("content"),
  };

  const res = await fetch("/api/opinions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    statusEl.textContent = "Błąd zapisu opinii.";
    return;
  }

  form.reset();
  statusEl.textContent = "Opinia zapisana ✅";
  await loadOpinions();
});

loadOpinions();
