<script>
  import { questions, questionById, parties } from "./lib/content.js";
  import { score } from "./lib/scoring.js";
  import { load, save, clear, exportJson } from "./lib/storage.js";
  import Home from "./routes/Home.svelte";
  import Quiz from "./routes/Quiz.svelte";
  import Result from "./routes/Result.svelte";
  import Method from "./routes/Method.svelte";

  const saved = load();
  let answers = $state(saved?.answers ?? {});
  let path = $state(location.pathname);

  function parse(p) {
    if (p.startsWith("/texte/")) return { name: "quiz", slug: p.slice("/texte/".length) };
    if (p === "/resultat") return { name: "result" };
    if (p === "/methode") return { name: "method" };
    return { name: "home" };
  }

  function navigate(to) {
    if (to !== location.pathname) history.pushState({}, "", to);
    path = to;
    scrollTo({ top: 0 });
  }

  $effect(() => {
    const onPop = () => (path = location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  });

  // Sauvegarde à chaque changement : rien ne quitte l'appareil.
  $effect(() => {
    save({ version: 1, answers: $state.snapshot(answers), updatedAt: new Date().toISOString() });
  });

  const route = $derived(parse(path));
  const currentQuestion = $derived(route.name === "quiz" ? questionById.get(route.slug) : null);
  const currentIndex = $derived(currentQuestion ? questions.indexOf(currentQuestion) : -1);
  const answeredCount = $derived(Object.values(answers).filter((a) => a.choice !== "skip").length);
  const result = $derived(score(questions, answers, parties));

  function answer(choice) {
    answers[currentQuestion.id] = { choice, at: new Date().toISOString() };
    const next = questions[currentIndex + 1];
    navigate(next ? `/texte/${next.id}` : "/resultat");
  }

  function back() {
    const prev = questions[currentIndex - 1];
    navigate(prev ? `/texte/${prev.id}` : "/");
  }

  function start() {
    const firstUnanswered = questions.find((q) => !answers[q.id]) ?? questions[0];
    navigate(`/texte/${firstUnanswered.id}`);
  }

  function restart() {
    if (!confirm("Effacer vos réponses et recommencer ?")) return;
    answers = {};
    clear();
    navigate("/");
  }

  function exportAnswers() {
    exportJson(
      {
        exportedAt: new Date().toISOString(),
        questions: questions.map((q) => ({ id: q.id, titre: q.texte.titre })),
        answers: $state.snapshot(answers),
        result: result.ranked.map((r) => ({
          groupe: r.label,
          accordsFermes: r.firm,
          accordsPartages: r.shared,
          divergences: r.disagreements.map((d) => d.id),
        })),
      },
      `hemicycle-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
</script>

<header class="site">
  <div class="inner">
    <a class="brand" href="/" onclick={(e) => { e.preventDefault(); navigate("/"); }}>Hemicycle</a>
    <nav>
      <a href="/methode" onclick={(e) => { e.preventDefault(); navigate("/methode"); }}>Méthode</a>
      {#if answeredCount > 0}
        <a href="/resultat" onclick={(e) => { e.preventDefault(); navigate("/resultat"); }}>Résultat</a>
      {/if}
    </nav>
  </div>
</header>

<main>
  {#if route.name === "quiz" && currentQuestion}
    <Quiz
      question={currentQuestion}
      index={currentIndex}
      total={questions.length}
      {answers}
      onanswer={answer}
      onback={currentIndex > 0 ? back : null}
    />
  {:else if route.name === "result"}
    <Result {result} total={questions.length} onrestart={restart} onexport={exportAnswers} />
  {:else if route.name === "method"}
    <Method />
  {:else}
    <Home answered={answeredCount} onstart={start} />
  {/if}
</main>

<footer class="site">
  <div class="inner">
    Contenu vérifié contre les comptes rendus et les scrutins de l'Assemblée nationale.
    Vos réponses restent dans votre navigateur.
  </div>
</footer>
