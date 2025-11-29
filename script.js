// ------------------------------
// Script pour "Mes candidatures"
// ------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const retirerBtns = document.querySelectorAll(".btn-retirer");
  const detailBtns = document.querySelectorAll(".btn-detail");

  // --- Bouton "Retirer" ---
  retirerBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const confirmation = confirm("Voulez-vous vraiment retirer cette candidature ?");
      if (confirmation) {
        const candidature = btn.closest(".candidature");
        candidature.style.transition = "opacity 0.4s ease";
        candidature.style.opacity = 0;
        setTimeout(() => candidature.remove(), 400);
      }
    });
  });

  // --- Bouton "Voir la candidature" ---
  detailBtns.forEach(button => {
    button.addEventListener("click", () => {
      const candidature = button.closest(".candidature");
      const details = candidature.querySelector(".candidature-details");

      if (!details) return;

      // Bascule la classe "show"
      const isVisible = details.classList.toggle("show");
      button.textContent = isVisible ? "Masquer la candidature" : "Voir la candidature";
    });
  });
});
