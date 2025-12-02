// ------------------------------
// Script central : candidatures + favoris
// ------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const retirerBtns = document.querySelectorAll(".btn-retirer");
  const detailBtns = document.querySelectorAll(".btn-detail");

  // --- Favoris: gestion via localStorage ---
  const FAVORIS_KEY = 'favoris_offres';

  function getFavoris() {
    try {
      return JSON.parse(localStorage.getItem(FAVORIS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveFavoris(list) {
    localStorage.setItem(FAVORIS_KEY, JSON.stringify(list));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
  }

  function renderFavorisList() {
    const container = document.getElementById('liste-favoris');
    if (!container) return;
    const favoris = getFavoris();
    if (favoris.length === 0) {
      container.innerHTML = '<p>Aucun favori pour l\'instant.</p>';
      return;
    }

    container.innerHTML = '';
    const useCandidaturesLayout = document.getElementById('liste-candidatures') !== null;
    favoris.forEach(f => {
      if (useCandidaturesLayout) {
        const cand = document.createElement('div');
        cand.className = 'candidature';
        cand.dataset.id = f.id;

        const h3 = document.createElement('h3');
        h3.textContent = f.title + ' - ' + f.company;

        const p = document.createElement('p');
        p.innerHTML = `Date d'enregistrement : ${new Date().toLocaleDateString()}<br>Statut : <span class="statut en-attente">Favori</span><br>${escapeHtml(f.meta)}`;

        const btnVoir = document.createElement('button');
        btnVoir.className = 'btn-secondaire btn-voir';
        btnVoir.textContent = 'Voir les détails';

        const btnRetirer = document.createElement('button');
        btnRetirer.className = 'btn-retirer';
        btnRetirer.textContent = 'Retirer';

        // Bloc de details
        const details = document.createElement('div');
        details.className = 'candidature-details';
        details.innerHTML = `<p><strong>Programmes compatibles :</strong> ${escapeHtml(f.programs)}</p>`;

        cand.appendChild(h3);
        cand.appendChild(p);
        cand.appendChild(btnVoir);
        cand.appendChild(btnRetirer);
        cand.appendChild(details);

        container.appendChild(cand);
      } else {
        const offre = document.createElement('div');
        offre.className = 'offre offre-fav';
        offre.dataset.id = f.id;

        const header = document.createElement('div');
        header.className = 'offre-header';

        const left = document.createElement('div');
        const h3 = document.createElement('h3');
        h3.textContent = f.company;
        const pTitle = document.createElement('p');
        pTitle.innerHTML = '<strong>Titre du poste :</strong> ' + escapeHtml(f.title);
        const pMeta = document.createElement('p');
        pMeta.textContent = f.meta;
        const pProg = document.createElement('p');
        pProg.textContent = f.programs;

        left.appendChild(h3);
        left.appendChild(pTitle);
        left.appendChild(pMeta);
        left.appendChild(pProg);

        header.appendChild(left);

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.display = 'none';
        header.appendChild(badge);

        const actions = document.createElement('div');
        actions.className = 'offre-actions';

        const btnVoir = document.createElement('button');
        btnVoir.className = 'btn-secondaire btn-voir';
        btnVoir.textContent = 'Voir les détails';

        const btnSupprimer = document.createElement('button');
        btnSupprimer.className = 'btn-retirer btn-supprimer-fav';
        btnSupprimer.textContent = '🗑️ Retirer';

        actions.appendChild(btnVoir);
        actions.appendChild(btnSupprimer);

        offre.appendChild(header);
        offre.appendChild(actions);

        container.appendChild(offre);
      }
    });
  }

  function addFavori(offreObj) {
    const list = getFavoris();
    if (list.find(f => f.id === offreObj.id)) {
      showToast('Cette offre est déjà dans vos favoris.');
      return;
    }
    list.push(offreObj);
    saveFavoris(list);
    showToast('Offre ajoutée aux favoris.');
  }

  function removeFavori(id) {
    let list = getFavoris();
    list = list.filter(f => f.id !== id);
    saveFavoris(list);
    renderFavorisList();
  }

  // Fait la gestion du bouton « Ajouter aux favoris » 
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const text = (btn.textContent || '').toLowerCase();
    if (!text.includes('ajouter aux favoris') && !text.includes('❤️')) return;

    const offreEl = btn.closest('.offre');
    if (!offreEl) return;

    const header = offreEl.querySelector('.offre-header > div');
    const company = header.querySelector('h3')?.textContent.trim() || '';
    const pTags = header.querySelectorAll('p');
    let title = '';
    let meta = '';
    let programs = '';
    if (pTags[0]) title = pTags[0].textContent.replace('Titre du poste :','').trim();
    if (pTags[1]) meta = pTags[1].textContent.trim();
    if (pTags[2]) programs = pTags[2].textContent.trim();

    const id = company + '|' + title;
    const offreObj = { id, company, title, meta, programs };
    addFavori(offreObj);
  });

  // --- Filtres : appliquer et réinitialisation ---
  function parseMeta(metaText) {
    const parts = metaText.split('|').map(p => p.trim());
    const map = {};
    parts.forEach(p => {
      const idx = p.indexOf(':');
      if (idx === -1) return;
      const key = p.slice(0, idx).trim().toLowerCase();
      const val = p.slice(idx + 1).trim();
      map[key] = val;
    });
    return map;
  }

  function normalizeString(s) {
    if (!s) return '';
    return s
      .toString()
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[\s]+/g, ' ')
      .toLowerCase();
  }

  function parseSalary(s) {
    if (!s) return null;
    const matches = Array.from(s.matchAll(/(\d+(?:[.,]\d+)?)/g)).map(m => m[1].replace(',', '.'));
    if (!matches.length) return null;
    const nums = matches.map(n => parseFloat(n)).filter(n => !isNaN(n));
    if (!nums.length) return null;
    return Math.max(...nums);
  }

  function parseSalaryAll(s) {
    if (!s) return [];
    const matches = Array.from(s.matchAll(/(\d+(?:[.,]\d+)?)/g)).map(m => m[1].replace(',', '.'));
    const nums = matches.map(n => parseFloat(n)).filter(n => !isNaN(n));
    return nums;
  }

  function parseDureeToWeeks(dureeText) {
    if (!dureeText) return null;
    const numMatch = dureeText.match(/(\d+(?:[.,]\d+)?)/);
    if (!numMatch) return null;
    const num = parseFloat(numMatch[1].replace(',', '.'));
    if (/mois?/i.test(dureeText)) return Math.round(num * 4);
    if (/semaine|semaines|sem/i.test(dureeText)) return Math.round(num);
    return null;
  }

  function ensureOfferDataAttrs(offreEl) {
    if (!offreEl) return;
    if (offreEl.dataset._normalized === '1') return;
    const header = offreEl.querySelector('.offre-header > div');
    if (!header) return;
    const pTags = header.querySelectorAll('p');
    const metaText = pTags[1] ? pTags[1].textContent.trim() : '';
    const meta = parseMeta(metaText);

    // Ville 
    const ville = (meta['lieu'] || meta['ville'] || '').split(',')[0].trim();
    if (ville) offreEl.dataset.ville = normalizeString(ville);

    // Numero de salaire
    let salaire = parseSalary(meta['salaire']);
    const headerText = header.textContent || '';
    if (salaire === null) {
      salaire = parseSalary(headerText);
    }
    if (salaire !== null) offreEl.dataset.salaire = String(salaire);
    const salList = parseSalaryAll(meta['salaire'] || headerText);
    if (salList.length) offreEl.dataset.salaireList = salList.join(',');

    // Durée en semaine
    const dureeWeeks = parseDureeToWeeks(meta['durée'] || meta['duree'] || '');
    if (dureeWeeks !== null) offreEl.dataset.dureeWeeks = String(dureeWeeks);

    // Mode normalisé
    if (meta['mode']) offreEl.dataset.mode = normalizeString(meta['mode']);

    if (!offreEl.dataset.type) {
      const text = (offreEl.textContent || '').toLowerCase();
      if (text.indexOf('pme') !== -1) offreEl.dataset.type = 'pme';
      else if (text.indexOf('ge') !== -1) offreEl.dataset.type = 'ge';
      else offreEl.dataset.type = '';
    } else {
      offreEl.dataset.type = normalizeString(offreEl.dataset.type);
    }

    // marque normalisé
    offreEl.dataset._normalized = '1';
  }

  function normalizeAllOffers() {
    document.querySelectorAll('.offre').forEach(ensureOfferDataAttrs);
  }

  function offerMatchesFilters(offreEl, filters) {
    const header = offreEl.querySelector('.offre-header > div');
    if (!header) return false;
    const pTags = header.querySelectorAll('p');
    const metaText = pTags[1] ? pTags[1].textContent.trim() : '';
    const meta = parseMeta(metaText);

    const villeVal = offreEl.dataset.ville || normalizeString(meta['lieu'] || meta['ville'] || '');
    const salaireVal = (offreEl.dataset.salaire ? parseFloat(offreEl.dataset.salaire) : parseSalary(meta['salaire'] || ''));
    const salaireList = offreEl.dataset.salaireList ? (offreEl.dataset.salaireList.split(',').map(n => parseFloat(n)).filter(n => !isNaN(n))) : parseSalaryAll(meta['salaire'] || '');
    const dureeWeeks = (offreEl.dataset.dureeWeeks ? parseInt(offreEl.dataset.dureeWeeks, 10) : parseDureeToWeeks(meta['durée'] || meta['duree'] || ''));
    const modeVal = offreEl.dataset.mode || normalizeString(meta['mode'] || '');
    const typeVal = (offreEl.dataset.type || '').toLowerCase();

    const checks = [];

    if (filters.ville) {
      const v = normalizeString(filters.ville);
      checks.push(v.length === 0 ? true : (villeVal && villeVal.indexOf(v) !== -1));
    }

    if (filters.salaire) {
      const target = parseFloat(filters.salaire);
      if (!isNaN(target)) {
        if (salaireList && salaireList.length) {
          checks.push(salaireList.some(n => n === target));
        } else {
          checks.push(salaireVal !== null && !isNaN(salaireVal) && salaireVal === target);
        }
      } else {
        checks.push(false);
      }
    }

    if (filters.duree) {
      const targetWeeks = parseInt(filters.duree, 10);
      // Il faut exiger une correspondance exacte pour la durée (en semaines) et même pour le salaire 
      checks.push(!isNaN(targetWeeks) && dureeWeeks !== null && dureeWeeks === targetWeeks);
    }

    if (filters.type) {
      const t = normalizeString(filters.type);
      checks.push(typeVal && typeVal.indexOf(t) !== -1);
    }

    if (filters.mode) {
      const m = normalizeString(filters.mode);
      checks.push(modeVal && modeVal.indexOf(m) !== -1);
    }

    // Terme de recherche correspond-tu à une l’entreprise, un titre ou tout autre texte?
    if (filters.search) {
      const s = normalizeString(filters.search);
      if (s.length === 0) {
        checks.push(true);
      } else {
        const company = normalizeString(header.querySelector('h3')?.textContent || '');
        const title = normalizeString(pTags[0] ? pTags[0].textContent.replace(/Titre du poste\s*:\s*/i, '') : '');
        const combined = normalizeString(offreEl.textContent || '');
        const found = (company && company.indexOf(s) !== -1) || (title && title.indexOf(s) !== -1) || (combined && combined.indexOf(s) !== -1);
        checks.push(!!found);
      }
    }

    if (checks.length === 0) return true;
    // Combine plusieurs filtres actifs 
    return checks.every(Boolean);
  }

  function applyFilters() {
    const ville = document.getElementById('ville-select')?.value || '';
    const salaire = document.getElementById('salaire-select')?.value || '';
    const duree = document.getElementById('duree-select')?.value || '';
    const type = document.getElementById('type-select')?.value || '';
    const mode = document.getElementById('mode-select')?.value || '';
    const combiner = document.getElementById('combiner')?.checked || false;
    const search = document.getElementById('barre-recherche')?.value || '';

    const filters = { ville, salaire, duree, type, mode, combiner, search };

    // Sauvegarde la recherche récente 
    try { if (search && search.toString().trim().length) saveRecentSearch(search); } catch (err) { }

    // Assure que toutes les offres ont les attributs nécessaires
    normalizeAllOffers();
    const offres = Array.from(document.querySelectorAll('.offre'));
    let visibleCount = 0;
    offres.forEach(o => {
      const visible = offerMatchesFilters(o, filters);
      o.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Affiche "aucun résultat" lorsqu'aucune offre ne correspond à la recherche voulu
    const resultArea = document.getElementById('resultats');
    if (resultArea) {
      let noEl = document.getElementById('no-results-msg');
      if (!noEl) {
        noEl = document.createElement('p');
        noEl.id = 'no-results-msg';
        noEl.style.marginTop = '12px';
        noEl.style.color = '#666';
        noEl.textContent = 'Aucune offre ne correspond aux critères.';
        resultArea.appendChild(noEl);
      }
      noEl.style.display = visibleCount === 0 ? '' : 'none';
    }
    // --- Masquer la pagination si aucun résultat ---
    const pagination = document.querySelector('.pagination');
    if (pagination) {
      pagination.style.display = visibleCount === 0 ? 'none' : 'flex';
    }
    // Mise a jour de l’affichage des filtres actifs
    try { renderActiveFilters(filters); } catch (err) {  }
  }

  function resetFilters() {
    const ids = ['ville-select','salaire-select','duree-select','type-select','mode-select'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const comb = document.getElementById('combiner'); if (comb) comb.checked = false;
    // Affiche toutes les offres necessaire et masque le message "aucun résultat"
    document.querySelectorAll('.offre').forEach(o => o.style.display = '');
    const noEl = document.getElementById('no-results-msg'); if (noEl) noEl.style.display = 'none';
    // Vide la barre de recherche
    const searchInput = document.getElementById('barre-recherche'); if (searchInput) searchInput.value = '';
    // Mise a jour de l’affichage des filtres actifs
    try { renderActiveFilters({}); } catch (err) { }
  }

  // Lie les boutons aux fonctions respectieves
  const btnAppliquer = document.getElementById('appliquer');
  if (btnAppliquer) btnAppliquer.addEventListener('click', applyFilters);
  const btnReset = document.getElementById('reinitialiser');
  if (btnReset) btnReset.addEventListener('click', resetFilters);

  // Relie le bouton de recherche au bouton Enter dans la barre de recherche 
  const btnSearch = document.getElementById('btn-rechercher');
  const searchInput = document.getElementById('barre-recherche');
  if (btnSearch) btnSearch.addEventListener('click', applyFilters);
  if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } });

  // --- Ensembles de filtres enregistrés ---
  const SAVED_FILTERS_KEY = 'saved_filter_sets';

  function getSavedFilterSets() {
    try {
      return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveSavedFilterSets(list) {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(list));
  }

  function renderSavedFiltersDropdown() {
    // Affiche les ensembles de filtres enregistrés dans la liste #saved-filters-list
    const ul = document.getElementById('saved-filters-list');
    if (!ul) return;
    const sets = getSavedFilterSets();
    ul.innerHTML = '';
    if (!sets || sets.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucun filtre enregistré.';
      ul.appendChild(li);
      // S'assure que le bouton "Retirer tout" est mis à jour quand la liste est vide
      try { updateRetirerToutButtonsVisibility(); } catch (e) {}
      return;
    }
    sets.forEach(s => {
      const li = document.createElement('li');
      li.className = 'saved-filter-item';
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.title = 'Cliquer pour appliquer cet ensemble de filtres';

      const span = document.createElement('span');
      span.style.cursor = 'pointer';
      span.textContent = s.name;
      span.className = 'saved-filter-name';

      const del = document.createElement('button');
      del.className = 'btn-retirer retirer-saved-filter';
      del.innerHTML = '✖';
      del.setAttribute('aria-label', 'Retirer');
      del.title = 'Retirer';
      del.dataset.name = s.name;

      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
    // Mise a jour de la visibilité de Retirer tout buttons
    updateRetirerToutButtonsVisibility();
  }

  // Recherches récentes: affichage et gestion
  const RECENT_SEARCHES_KEY = 'recent_searches';

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRecentSearch(term) {
    try {
      const t = (term || '').toString().trim();
      if (!t) return;
      let list = getRecentSearches();
      const lower = t.toLowerCase();
      // Enleve les dupliqués
      list = list.filter(s => s.toLowerCase() !== lower);
      list.unshift(t);
      if (list.length > 6) list = list.slice(0, 6);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
      renderRecentSearches();
    } catch (err) {
    }
  }

  function renderRecentSearches() {
    const ul = document.getElementById('recent-searches-list');
    if (!ul) return;
    const list = getRecentSearches();
    ul.innerHTML = '';
    if (!list || list.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucune recherche récente.';
      ul.appendChild(li);
      try { updateRetirerToutButtonsVisibility(); } catch (e) {}
      return;
    }
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'recent-search-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const span = document.createElement('span');
      span.className = 'recent-search-text';
      span.style.cursor = 'pointer';
      span.title = 'Cliquer pour relancer cette recherche';
      span.textContent = s;

      const del = document.createElement('button');
      del.className = 'btn-retirer retirer-recent-search';
      del.innerHTML = '✖';
      del.setAttribute('aria-label', 'Retirer');
      del.title = 'Retirer';
      del.dataset.term = s;

      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
    updateRetirerToutButtonsVisibility();
  }

  // Recherche sauvegardée
  const SAVED_SEARCHES_KEY = 'saved_searches';

  function getSavedSearches() {
    try { return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveSavedSearch(term) {
    const t = (term || '').toString().trim();
    if (!t) { showToast('Recherche vide — impossible d\'enregistrer.'); return; }
    let list = getSavedSearches();
    const lower = t.toLowerCase();
    list = list.filter(s => s.toLowerCase() !== lower);
    list.unshift(t);
    if (list.length > 12) list = list.slice(0, 12);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list));
    renderSavedSearches();
    showToast('Recherche enregistrée.');
  }

  function renderSavedSearches() {
    const ul = document.getElementById('saved-searches-list');
    if (!ul) return;
    const list = getSavedSearches();
    ul.innerHTML = '';
    if (!list || list.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucune recherche enregistrée.';
      ul.appendChild(li);
      try { updateRetirerToutButtonsVisibility(); } catch (e) {}
      return;
    }
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'saved-search-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const span = document.createElement('span');
      span.className = 'saved-search-text';
      span.style.cursor = 'pointer';
      span.title = 'Cliquer pour mettre dans la barre de recherche';
      span.textContent = s;

      const del = document.createElement('button');
      del.className = 'btn-retirer retirer-saved-search';
      del.innerHTML = '✖';
      del.setAttribute('aria-label', 'Retirer');
      del.title = 'Retirer';
      del.dataset.term = s;

      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
    updateRetirerToutButtonsVisibility();
  }

  // Affiche les filtres actifs dans la barre du coté `#filtres-actifs`
  function renderActiveFilters(filters) {
    const container = document.getElementById('filtres-actifs');
    if (!container) return;
    container.innerHTML = '';
    filters = filters || {};
    const items = [];
    if (filters.ville) items.push({ label: 'Région', value: filters.ville, key: 'ville' });
    if (filters.salaire) items.push({ label: 'Salaire', value: (filters.salaire.toString().length ? filters.salaire + '$/h' : filters.salaire), key: 'salaire' });
    if (filters.duree) items.push({ label: 'Durée', value: (filters.duree.toString().length ? filters.duree + ' semaines' : filters.duree), key: 'duree' });
    if (filters.mode) items.push({ label: 'Mode', value: filters.mode, key: 'mode' });
    if (filters.type) items.push({ label: 'Type', value: filters.type, key: 'type' });

    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucun filtre actif.';
      container.appendChild(li);
      try { updateRetirerToutButtonsVisibility(); } catch (e) {}
      return;
    }

    items.forEach(it => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const span = document.createElement('span');
      span.innerHTML = `<strong>${it.label} :</strong> ${it.value}`;

      const del = document.createElement('button');
      del.className = 'btn-retirer retirer-active-filter';
      del.innerHTML = '✖';
      del.setAttribute('aria-label', 'Retirer');
      del.title = 'Retirer';
      del.dataset.filterKey = it.key;

      li.appendChild(span);
      li.appendChild(del);
      container.appendChild(li);
    });
    updateRetirerToutButtonsVisibility();
  }

  function saveCurrentFilterSet() {
    const name = prompt('Nommer cet ensemble de filtres:');
    if (!name) { showToast('Nom non fourni.'); return; }
    const sets = getSavedFilterSets();
    const existing = sets.find(s => s.name === name);

    function doSave() {
      const filters = {
        ville: document.getElementById('ville-select')?.value || '',
        salaire: document.getElementById('salaire-select')?.value || '',
        duree: document.getElementById('duree-select')?.value || '',
        type: document.getElementById('type-select')?.value || '',
        mode: document.getElementById('mode-select')?.value || '',
        combiner: document.getElementById('combiner')?.checked || false
      };
      if (existing) {
        existing.filters = filters;
      } else {
        sets.push({ name, filters });
      }
      saveSavedFilterSets(sets);
      renderSavedFiltersDropdown();
      showToast('Filtres enregistrés.');
    }

    if (existing) {
      showConfirm('Un ensemble existe déjà avec ce nom. Le remplacer ?').then(ok => { if (ok) doSave(); });
    } else {
      doSave();
    }
  }

  // Relie le bouton d’enregistrement de filtres
  const saveFiltersBtn = document.getElementById('save-filters-btn');
  if (saveFiltersBtn) saveFiltersBtn.addEventListener('click', saveCurrentFilterSet);

  // Relie le clic pour appliquer un ensemble de filtres enregistrés à partir de la liste latérale
  const savedFiltersUl = document.getElementById('saved-filters-list');
  if (savedFiltersUl) {
    savedFiltersUl.addEventListener('click', (e) => {
      // Supprime un ensemble de filtres enregistré
      const del = e.target.closest('.retirer-saved-filter');
      if (del) {
        const name = del.dataset.name;
        if (!name) return;
        showConfirm(`Retirer l'ensemble de filtres "${name}" ?`).then(ok => {
          if (!ok) return;
          let sets = getSavedFilterSets();
          sets = sets.filter(s => s.name !== name);
          saveSavedFilterSets(sets);
          renderSavedFiltersDropdown();
          showToast('Filtres retirés.');
        });
        return;
      }

      // Applique les filtres sauvegardés
      const nameSpan = e.target.closest('.saved-filter-name');
      const li = e.target.closest('.saved-filter-item');
      const name = (nameSpan && nameSpan.textContent) || (li && li.querySelector('.saved-filter-name')?.textContent) || '';
      if (!name) return;
      const set = getSavedFilterSets().find(s => s.name === name);
      if (!set || !set.filters) return;
      const f = set.filters;
      const mapSet = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      mapSet('ville-select', f.ville);
      mapSet('salaire-select', f.salaire);
      mapSet('duree-select', f.duree);
      mapSet('type-select', f.type);
      mapSet('mode-select', f.mode);
      const comb = document.getElementById('combiner'); if (comb) comb.checked = !!f.combiner;
      applyFilters();
    });
  }

  // Initialise le menu déroulant des filtres enregistrés
  renderSavedFiltersDropdown();

  // Initialise l’affichage des filtres actifs s'assurant qu'aucun sont actif au départ
  try { renderActiveFilters({}); } catch (err) { }

  // Initialise la liste des recherches récentes
  try { renderRecentSearches(); } catch (err) { }

  // Initialise la liste des recherches sauvegardées
  try { renderSavedSearches(); } catch (err) { }

  // Ajoute les boutons « Retirer tout » sous chaque section d’informations 
  function ensureRetirerToutButtons() {
    const sections = [
      { ulId: 'saved-filters-list', action: 'saved-filters' },
      { ulId: 'recent-searches-list', action: 'recent-searches' },
      { ulId: 'saved-searches-list', action: 'saved-searches' },
      { ulId: 'filtres-actifs', action: 'active-filters' }
    ];


    sections.forEach(s => {
      const ul = document.getElementById(s.ulId);
      if (!ul) return;
      // Vérifie si le bouton existe déjà pour éviter les doublons
      const existing = document.querySelector(`.btn-retirer-tout[data-target="${s.ulId}"]`);
      if (existing) return;
      const btn = document.createElement('button');
      btn.className = 'btn-retirer btn-retirer-tout';
      btn.textContent = 'Retirer tout';
      btn.setAttribute('aria-label', 'Retirer tout');
      btn.title = 'Retirer tout';
      btn.dataset.target = s.ulId;
      btn.style.display = 'none';
      btn.style.marginTop = '6px';
      btn.style.width = '100%';
      btn.style.padding = '8px 10px';
      ul.insertAdjacentElement('afterend', btn);
    });
  }

  function updateRetirerToutButtonsVisibility() {
    const ids = ['saved-filters-list','recent-searches-list','saved-searches-list','filtres-actifs'];
    ids.forEach(id => {
      const ul = document.getElementById(id);
      const btn = document.querySelector(`.btn-retirer-tout[data-target="${id}"]`);
      if (!ul || !btn) return;
      const items = Array.from(ul.children).filter(n => n.tagName.toLowerCase() === 'li');
      if (items.length === 0) { btn.style.display = 'none'; return; }
      const firstText = (items[0].textContent || '').trim().toLowerCase();
      if (firstText.startsWith('aucun') || firstText.startsWith('aucune')) { btn.style.display = 'none'; return; }
      btn.style.display = 'block';
    });
  }

  ensureRetirerToutButtons();
  updateRetirerToutButtonsVisibility();

  // Gère les clics sur le bouton « Retirer tout »
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-retirer-tout');
    if (!btn) return;
    const target = btn.dataset.target;
    if (!target) return;
    if (target === 'saved-filters-list') {
      showConfirm('Retirer tous les filtres enregistrés ?').then(ok => {
        if (!ok) return;
        saveSavedFilterSets([]);
        renderSavedFiltersDropdown();
        showToast('Tous les filtres enregistrés ont été retirés.');
      });
      return;
    }
    if (target === 'recent-searches-list') {
      showConfirm('Retirer toutes les recherches récentes ?').then(ok => {
        if (!ok) return;
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([]));
        renderRecentSearches();
        showToast('Recherches récentes retirées.');
      });
      return;
    }
    if (target === 'saved-searches-list') {
      showConfirm('Retirer toutes les recherches enregistrées ?').then(ok => {
        if (!ok) return;
        localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify([]));
        renderSavedSearches();
        showToast('Recherches enregistrées retirées.');
      });
      return;
    }
    if (target === 'filtres-actifs') {
      showConfirm('Retirer tous les filtres actifs ?').then(ok => {
        if (!ok) return;
        resetFilters();
        applyFilters();
        showToast('Filtres actifs retirés.');
      });
      return;
    }
  });

  // Permet la suppression directe des filtres actifs avec la barre latérale
  const activeFiltersUl = document.getElementById('filtres-actifs');
  if (activeFiltersUl) {
    activeFiltersUl.addEventListener('click', (e) => {
      const del = e.target.closest('.retirer-active-filter');
      if (!del) return;
      const key = del.dataset.filterKey;
      if (!key) return;
      // Associe la clé du filtre à son élément de contrôle
      const map = {
        'search': () => { const el = document.getElementById('barre-recherche'); if (el) el.value = ''; },
        'ville': () => { const el = document.getElementById('ville-select'); if (el) el.value = ''; },
        'salaire': () => { const el = document.getElementById('salaire-select'); if (el) el.value = ''; },
        'duree': () => { const el = document.getElementById('duree-select'); if (el) el.value = ''; },
        'mode': () => { const el = document.getElementById('mode-select'); if (el) el.value = ''; },
        'type': () => { const el = document.getElementById('type-select'); if (el) el.value = ''; }
      };
      if (map[key]) map[key]();
      applyFilters();
    });
  }

  // Si on se trouve sur la page des favoris, on gère ici les clics de suppression et l’affichage
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-supprimer-fav');
    if (!btn) return;
    const parent = btn.closest('.offre-fav');
    if (!parent) return;
    const id = parent.dataset.id;
    if (!id) return;
    showConfirm('Retirer cette offre des favoris ?').then(confirmed => {
      if (confirmed) removeFavori(id);
    });
  });

  // Permet de relancer une recherche récente en cliquant dans la liste
  const recentUl = document.getElementById('recent-searches-list');
  if (recentUl) {
    recentUl.addEventListener('click', (e) => {
      const del = e.target.closest('.retirer-recent-search');
      if (del) {
        const term = del.dataset.term;
        if (!term) return;
        showConfirm(`Retirer la recherche récente "${term}" ?`).then(ok => {
          if (!ok) return;
          let list = getRecentSearches();
          list = list.filter(s => s !== term);
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
          renderRecentSearches();
        });
        return;
      }

      const span = e.target.closest('.recent-search-text');
      const li = e.target.closest('.recent-search-item');
      const term = (span && span.textContent) || (li && li.querySelector('.recent-search-text')?.textContent) || '';
      if (!term) return;
      const input = document.getElementById('barre-recherche');
      if (input) input.value = term;
      applyFilters();
    });
  }

  // Nous permet de réutiliser une recherche enregistrée avec un clic
  const savedUl = document.getElementById('saved-searches-list');
  if (savedUl) {
    savedUl.addEventListener('click', (e) => {
      const del = e.target.closest('.retirer-saved-search');
      if (del) {
        const term = del.dataset.term;
        if (!term) return;
        showConfirm(`Retirer la recherche enregistrée "${term}" ?`).then(ok => {
          if (!ok) return;
          let list = getSavedSearches();
          list = list.filter(s => s !== term);
          localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list));
          renderSavedSearches();
        });
        return;
      }

      const span = e.target.closest('.saved-search-text');
      const li = e.target.closest('.saved-search-item');
      const term = (span && span.textContent) || (li && li.querySelector('.saved-search-text')?.textContent) || '';
      if (!term) return;
      const input = document.getElementById('barre-recherche');
      if (input) input.value = term;
      applyFilters();
    });
  }

  // Relie le bouton d’enregistrement de recherche
  const saveSearchBtn = document.getElementById('save-search-btn');
  if (saveSearchBtn) saveSearchBtn.addEventListener('click', () => {
    const term = (document.getElementById('barre-recherche')?.value || '').toString().trim();
    if (!term) { showToast('Tapez une recherche avant d\'enregistrer.'); return; }
    saveSavedSearch(term);
  });

  // Ouvre l'onglet avec le screenshot et le btn de retour
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-voir');
    if (!btn) return;
    // essai d'ouvrir un onglet
    const newWin = window.open('', '_blank');
    if (!newWin) {
      showToast('Impossible d\'ouvrir un nouvel onglet (popup bloquée).');
      return;
    }
    const imgPath = 'detail-offre.png';
    const title = btn.closest('.offre')?.querySelector('h3')?.textContent || 'Détails de l\'offre';
    const html = `<!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${escapeHtml(title)}</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:20px;background:#f6f7fb;color:#222}img{max-width:100%;height:auto;display:block;margin-bottom:12px}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}button{background:#3b4c6b;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer}button:active{transform:translateY(1px)}</style>
      </head>
      <body>
        <header>
          <h1 style="font-size:1.1rem;margin:0">${escapeHtml(title)}</h1>
          <button id="retour">Retour</button>
        </header>
        <main>
          <img src="${imgPath}" alt="Détails de l'offre" onerror="this.style.display='none'">
        </main>
        <script>document.getElementById('retour').addEventListener('click', ()=>{window.close();});</script>
      </body>
      </html>`;
    try {
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
    } catch (err) {
      try { newWin.location.href = imgPath; } catch (e) {  }
    }
  });

// Affiche les favoris au chargement de la page
  renderFavorisList();

  // --- Notif toast ---
  // Creation du container
  (function createToastContainer(){
    if (document.getElementById('toast-container')) return;
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  })();

  function showToast(message, timeout = 2800) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    container.appendChild(t);
    // rentrer dans animation
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, timeout);
  }

  // --- Confirmation modale  ---
  function showConfirm(message) {
    return new Promise(resolve => {
      let modal = document.getElementById('confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.innerHTML = `
          <div class="confirm-backdrop">
            <div class="confirm-content">
              <p id="confirm-message"></p>
              <div class="confirm-actions">
                <button id="confirm-no" class="btn-retirer">Annuler</button>
                <button id="confirm-yes" class="btn-secondaire">Confirmer</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const msgEl = modal.querySelector('#confirm-message');
      msgEl.textContent = message;
      modal.style.display = 'block';

      const yes = modal.querySelector('#confirm-yes');
      const no = modal.querySelector('#confirm-no');

      function cleanup(result) {
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
        modal.style.display = 'none';
        resolve(result);
      }

      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }

      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
    });
  }

  // Gestion déléguée des actions de candidature pour que les favoris dynamiques fonctionnent aussi
  document.addEventListener('click', (e) => {
    // Bouton "Retirer" à l'intérieur d'une .candidature (fonctionne pour "Mes candidatures" et "Favoris")
    const retirerBtn = e.target.closest('.btn-retirer');
    if (retirerBtn) {
      const candidature = retirerBtn.closest('.candidature');
      if (!candidature) return;
      showConfirm("Voulez-vous vraiment retirer cette candidature ?").then(confirmed => {
        if (!confirmed) return;
        // Si cette candidature correspond à un favori (possède un data-id), la retirer du stockage
        const favId = candidature.dataset.id;
        if (favId) {
          removeFavori(favId);
          showToast('Offre retirée des favoris.');
        } else {
          // Sinon, animer simplement la suppression pour les candidatures non enregistrées en favoris
          candidature.style.transition = 'opacity 0.4s ease';
          candidature.style.opacity = 0;
          setTimeout(() => candidature.remove(), 400);
        }
      });
      return;
    }

    // Voir la candidature toggle
    const detailBtn = e.target.closest('.btn-detail');
    if (detailBtn) {
      const candidature = detailBtn.closest('.candidature');
      if (!candidature) return;
      const details = candidature.querySelector('.candidature-details');
      if (!details) return;
      const isVisible = details.classList.toggle('show');
      detailBtn.textContent = isVisible ? 'Masquer la candidature' : 'Voir la candidature';
    }
  });
});
