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
        // render as .candidature to match Mes candidatures UI
        const cand = document.createElement('div');
        cand.className = 'candidature';
        cand.dataset.id = f.id;

        const h3 = document.createElement('h3');
        h3.textContent = f.title + ' - ' + f.company;

        const p = document.createElement('p');
        p.innerHTML = `Date d'enregistrement : ${new Date().toLocaleDateString()}<br>Statut : <span class="statut en-attente">Favori</span><br>${escapeHtml(f.meta)}`;

        const btnVoir = document.createElement('button');
        btnVoir.className = 'btn-detail';
        btnVoir.textContent = 'Voir la candidature';

        const btnRetirer = document.createElement('button');
        btnRetirer.className = 'btn-retirer';
        btnRetirer.textContent = 'Retirer';

        // details block (copy programs as a detail)
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
        btnVoir.className = 'btn-secondaire';
        btnVoir.textContent = 'Voir les détails';

        const btnSupprimer = document.createElement('button');
        btnSupprimer.className = 'btn-delete btn-supprimer-fav';
        btnSupprimer.textContent = '🗑️ Supprimer';

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

  // Click handler for 'Ajouter aux favoris' buttons on listings
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

  // --- Filters: apply / reset ---
  function parseMeta(metaText) {
    // metaText example: "Lieu : Boucherville, QC | Salaire : 26$/h | Durée : 6 mois | Mode : Présentiel"
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
    // remove diacritics and normalize spacing
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
    // find all numbers and return the largest (handles ranges like "18-22$/h")
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

  // Ensure each .offre has data-* attributes for fast filtering
  function ensureOfferDataAttrs(offreEl) {
    if (!offreEl) return;
    // if already populated, skip
    if (offreEl.dataset._normalized === '1') return;
    const header = offreEl.querySelector('.offre-header > div');
    if (!header) return;
    const pTags = header.querySelectorAll('p');
    const metaText = pTags[1] ? pTags[1].textContent.trim() : '';
    const meta = parseMeta(metaText);

    // Ville (first token before comma), normalized
    const ville = (meta['lieu'] || meta['ville'] || '').split(',')[0].trim();
    if (ville) offreEl.dataset.ville = normalizeString(ville);

    // Salaire number (try meta first, otherwise search entire header text)
    let salaire = parseSalary(meta['salaire']);
    const headerText = header.textContent || '';
    if (salaire === null) {
      salaire = parseSalary(headerText);
    }
    if (salaire !== null) offreEl.dataset.salaire = String(salaire);
    // also store all salaries found (for exact-match filtering)
    const salList = parseSalaryAll(meta['salaire'] || headerText);
    if (salList.length) offreEl.dataset.salaireList = salList.join(',');

    // Durée in weeks
    const dureeWeeks = parseDureeToWeeks(meta['durée'] || meta['duree'] || '');
    if (dureeWeeks !== null) offreEl.dataset.dureeWeeks = String(dureeWeeks);

    // Mode normalized
    if (meta['mode']) offreEl.dataset.mode = normalizeString(meta['mode']);

    // Type: try existing data-type, otherwise try to infer from text (pme/ge)
    if (!offreEl.dataset.type) {
      const text = (offreEl.textContent || '').toLowerCase();
      if (text.indexOf('pme') !== -1) offreEl.dataset.type = 'pme';
      else if (text.indexOf('ge') !== -1) offreEl.dataset.type = 'ge';
      else offreEl.dataset.type = '';
    } else {
      offreEl.dataset.type = normalizeString(offreEl.dataset.type);
    }

    // mark normalized
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

    // Prefer data-* attributes when available, otherwise parse & normalize
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
      // require exact match for duration (in weeks) — same behaviour as salaire exact-match
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

    // Search term: match company, title or any text
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
    // Combine multiple active filters using AND: all checks must pass
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

    // Save recent search term (if any)
    try { if (search && search.toString().trim().length) saveRecentSearch(search); } catch (err) { }
    // do not auto-save to 'saved searches' — that's explicit with "Enregistrer la recherche" button

    // Ensure data attrs exist for all offers
    normalizeAllOffers();
    const offres = Array.from(document.querySelectorAll('.offre'));
    let visibleCount = 0;
    offres.forEach(o => {
      const visible = offerMatchesFilters(o, filters);
      o.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Show no-results message when none match
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
    // Update the active filters display
    try { renderActiveFilters(filters); } catch (err) { /* ignore if not available */ }
  }

  function resetFilters() {
    const ids = ['ville-select','salaire-select','duree-select','type-select','mode-select'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const comb = document.getElementById('combiner'); if (comb) comb.checked = false;
    // show all and hide no-results
    document.querySelectorAll('.offre').forEach(o => o.style.display = '');
    const noEl = document.getElementById('no-results-msg'); if (noEl) noEl.style.display = 'none';
    // clear search input
    const searchInput = document.getElementById('barre-recherche'); if (searchInput) searchInput.value = '';
    // update active filters display
    try { renderActiveFilters({}); } catch (err) { }
  }

  // Bind buttons
  const btnAppliquer = document.getElementById('appliquer');
  if (btnAppliquer) btnAppliquer.addEventListener('click', applyFilters);
  const btnReset = document.getElementById('reinitialiser');
  if (btnReset) btnReset.addEventListener('click', resetFilters);

  // Wire search button and Enter key on search input
  const btnSearch = document.getElementById('btn-rechercher');
  const searchInput = document.getElementById('barre-recherche');
  if (btnSearch) btnSearch.addEventListener('click', applyFilters);
  if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } });

  // --- Saved filter sets (localStorage) ---
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
    const sel = document.getElementById('saved-filters-select');
    if (!sel) return;
    const sets = getSavedFilterSets();
    sel.innerHTML = '<option value="">Filtres enregistrés</option>';
    sets.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }

  // Recent searches (saved in localStorage): render and manage
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
      // remove duplicates (case-insensitive)
      list = list.filter(s => s.toLowerCase() !== lower);
      list.unshift(t);
      // keep only most recent 6
      if (list.length > 6) list = list.slice(0, 6);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
      renderRecentSearches();
    } catch (err) {
      // ignore
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
      return;
    }
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'recent-search-item';
      li.style.cursor = 'pointer';
      li.title = 'Cliquer pour relancer cette recherche';
      li.textContent = s;
      ul.appendChild(li);
    });
  }

  // Saved searches (persisted list of saved search terms)
  const SAVED_SEARCHES_KEY = 'saved_searches';

  function getSavedSearches() {
    try { return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveSavedSearch(term) {
    const t = (term || '').toString().trim();
    if (!t) { showToast('Recherche vide — impossible d\'enregistrer.'); return; }
    let list = getSavedSearches();
    // remove duplicates (case-insensitive)
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
      return;
    }
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'saved-search-item';
      li.style.cursor = 'pointer';
      li.title = 'Cliquer pour mettre dans la barre de recherche';
      li.textContent = s;
      ul.appendChild(li);
    });
  }

  // Render the active filters in the sidebar `#filtres-actifs`
  function renderActiveFilters(filters) {
    const container = document.getElementById('filtres-actifs');
    if (!container) return;
    container.innerHTML = '';
    filters = filters || {};
    const items = [];
    if (filters.search) items.push({ label: 'Recherche', value: filters.search });
    if (filters.ville) items.push({ label: 'Région', value: filters.ville });
    if (filters.salaire) items.push({ label: 'Salaire', value: (filters.salaire.toString().length ? filters.salaire + '$/h' : filters.salaire) });
    if (filters.duree) items.push({ label: 'Durée', value: (filters.duree.toString().length ? filters.duree + ' semaines' : filters.duree) });
    if (filters.mode) items.push({ label: 'Mode', value: filters.mode });
    if (filters.type) items.push({ label: 'Type', value: filters.type });

    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucun filtre actif.';
      container.appendChild(li);
      return;
    }

    items.forEach(it => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${it.label} :</strong> ${it.value}`;
      container.appendChild(li);
    });
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

  // Wire save button
  const saveFiltersBtn = document.getElementById('save-filters-btn');
  if (saveFiltersBtn) saveFiltersBtn.addEventListener('click', saveCurrentFilterSet);

  // Wire dropdown apply
  const savedSel = document.getElementById('saved-filters-select');
  if (savedSel) savedSel.addEventListener('change', (e) => {
    const name = (e.target.value || '').toString();
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

  // initialize saved filters dropdown
  renderSavedFiltersDropdown();
  // initialize active filters display (none active at start)
  try { renderActiveFilters({}); } catch (err) { }
  // initialize recent searches list
  try { renderRecentSearches(); } catch (err) { }
  // initialize saved searches list
  try { renderSavedSearches(); } catch (err) { }

  // If on favoris page, handle remove clicks and render
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-supprimer-fav');
    if (!btn) return;
    const parent = btn.closest('.offre-fav');
    if (!parent) return;
    const id = parent.dataset.id;
    if (!id) return;
    showConfirm('Supprimer cette offre des favoris ?').then(confirmed => {
      if (confirmed) removeFavori(id);
    });
  });

  // Click-to-reuse for recent searches: delegate to the list
  const recentUl = document.getElementById('recent-searches-list');
  if (recentUl) {
    recentUl.addEventListener('click', (e) => {
      const li = e.target.closest('.recent-search-item');
      if (!li) return;
      const term = li.textContent || '';
      const input = document.getElementById('barre-recherche');
      if (input) input.value = term;
      applyFilters();
    });
  }

  // Click-to-use for saved searches
  const savedUl = document.getElementById('saved-searches-list');
  if (savedUl) {
    savedUl.addEventListener('click', (e) => {
      const li = e.target.closest('.saved-search-item');
      if (!li) return;
      const term = li.textContent || '';
      const input = document.getElementById('barre-recherche');
      if (input) input.value = term;
      applyFilters();
    });
  }

  // Wire save-search button
  const saveSearchBtn = document.getElementById('save-search-btn');
  if (saveSearchBtn) saveSearchBtn.addEventListener('click', () => {
    const term = (document.getElementById('barre-recherche')?.value || '').toString().trim();
    if (!term) { showToast('Tapez une recherche avant d\'enregistrer.'); return; }
    saveSavedSearch(term);
  });

  // Open a new tab showing the screenshot and a Retour button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-voir');
    if (!btn) return;
    // try to open a new tab/window
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
      // If writing fails, try navigating to the image directly as a fallback
      try { newWin.location.href = imgPath; } catch (e) { /* give up */ }
    }
  });

  // Render on load if favoris container exists
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
    // enter animation
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
                <button id="confirm-no" class="btn-delete">Annuler</button>
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
