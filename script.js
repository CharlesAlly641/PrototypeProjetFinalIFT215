// ------------------------------
// Script pour "Mes candidatures"
// ------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const retirerBtns = document.querySelectorAll(".btn-retirer");

  retirerBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const confirmation = confirm("Voulez-vous vraiment retirer cette candidature ?");
      if (confirmation) {
        const candidature = btn.closest(".candidature");
        candidature.style.transition = "opacity 0.4s ease";
        candidature.style.opacity = 0;

        setTimeout(() => {
          candidature.remove();
        }, 400);
      }
    });
  });
});
