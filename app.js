const BASE_URL = 'https://pokeapi.co/api/v2/pokemon';
const ARTWORK_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const FETCH_LIMIT = 60;

// ── Utilities ────────────────────────────────────────────────────────────────

function capitalise(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractIdFromUrl(url) {
  // URL format: https://pokeapi.co/api/v2/pokemon/1/
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

function padId(id) {
  return '#' + String(id).padStart(3, '0');
}

function showElement(id) {
  document.getElementById(id).hidden = false;
}

function hideElement(id) {
  document.getElementById(id).hidden = true;
}

// ── Router: decide which page we're on ───────────────────────────────────────

const isDetailsPage = window.location.pathname.toLowerCase().includes('details.html');

if (isDetailsPage) {
  initDetailsPage();
} else {
  initIndexPage();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX PAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function initIndexPage() {
  const grid = document.getElementById('pokemon-grid');

  try {
    const pokemonList = await fetchPokemonList(FETCH_LIMIT);
    renderGrid(grid, pokemonList);
  } catch (err) {
    console.error(err);
    hideElement('loading');
    showElement('error-msg');
  }
}

async function fetchPokemonList(limit) {
  const response = await fetch(`${BASE_URL}?limit=${limit}&offset=0`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.results.map(pokemon => ({
    name: pokemon.name,
    id: extractIdFromUrl(pokemon.url),
  }));
}

function renderGrid(grid, pokemonList) {
  hideElement('loading');
  showElement('pokemon-grid');

  pokemonList.forEach(pokemon => {
    const card = createPokemonCard(pokemon);
    grid.appendChild(card);
  });
}

function createPokemonCard({ id, name }) {
  const card = document.createElement('article');
  card.className = 'pokemon-card';

  const img = document.createElement('img');
  img.src = `${ARTWORK_BASE}/${id}.png`;
  img.alt = capitalise(name);
  img.loading = 'lazy';
  img.width = 100;
  img.height = 100;
  // Fallback to default sprite if official artwork is missing
  img.onerror = () => {
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  };

  const idLabel = document.createElement('span');
  idLabel.className = 'pokemon-id';
  idLabel.textContent = padId(id);

  const nameEl = document.createElement('h3');
  nameEl.textContent = capitalise(name);

  const link = document.createElement('a');
  link.href = `details.html?id=${id}`;
  link.className = 'btn';
  link.textContent = 'View Details';

  card.append(img, idLabel, nameEl, link);
  return card;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAILS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function initDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const detailsContainer = document.getElementById('pokemon-details');

  if (!id) {
    hideElement('loading');
    showElement('error-msg');
    document.getElementById('error-msg').textContent =
      'No Pokémon ID provided. Go back and select one.';
    return;
  }

  try {
    const pokemon = await fetchPokemonById(id);
    document.title = `${capitalise(pokemon.name)} | Pokédex`;
    renderDetails(detailsContainer, pokemon);
  } catch (err) {
    console.error(err);
    hideElement('loading');
    showElement('error-msg');
  }
}

async function fetchPokemonById(id) {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function renderDetails(container, pokemon) {
  hideElement('loading');
  showElement('pokemon-details');

  const officialArt =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    '';

  // Stat label display map
  const statLabels = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };

  const typesHTML = pokemon.types
    .map(t => `<span class="type type-${t.type.name}">${capitalise(t.type.name)}</span>`)
    .join('');

  const abilitiesHTML = pokemon.abilities
    .map(a => {
      const cls = a.is_hidden ? 'ability-tag hidden-ability' : 'ability-tag';
      const label = a.is_hidden ? `${capitalise(a.ability.name)} (hidden)` : capitalise(a.ability.name);
      return `<span class="${cls}">${label}</span>`;
    })
    .join('');

  const statsHTML = pokemon.stats
    .map(s => {
      const label = statLabels[s.stat.name] || capitalise(s.stat.name);
      const pct = Math.min(100, Math.round((s.base_stat / 255) * 100));
      return `
        <div class="stat-row">
          <span class="stat-label">${label}</span>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="stat-value">${s.base_stat}</span>
        </div>`;
    })
    .join('');

  // Show first 20 moves to avoid flooding the page
  const movesHTML = pokemon.moves
    .slice(0, 20)
    .map(m => `<span class="move-tag">${capitalise(m.move.name)}</span>`)
    .join('');

  container.innerHTML = `
    <div class="details-wrapper">

      <!-- Left column: image + basic identity -->
      <div class="details-image-col">
        <img src="${officialArt}" alt="${capitalise(pokemon.name)}" />
        <span class="details-number">${padId(pokemon.id)}</span>
        <h2 class="details-name">${capitalise(pokemon.name)}</h2>
        <div class="types">${typesHTML}</div>
      </div>

      <!-- Right column: stats & details -->
      <div class="details-info-col">

        <div>
          <p class="section-title">Profile</p>
          <div class="info-grid">
            <div class="info-tile">
              <div class="label">Height</div>
              <div class="value">${(pokemon.height / 10).toFixed(1)} m</div>
            </div>
            <div class="info-tile">
              <div class="label">Weight</div>
              <div class="value">${(pokemon.weight / 10).toFixed(1)} kg</div>
            </div>
            <div class="info-tile">
              <div class="label">Base XP</div>
              <div class="value">${pokemon.base_experience ?? '—'}</div>
            </div>
          </div>
        </div>

        <div>
          <p class="section-title">Abilities</p>
          <div class="abilities">${abilitiesHTML}</div>
        </div>

        <div>
          <p class="section-title">Base Stats</p>
          <div class="stats-list">${statsHTML}</div>
        </div>

        <div>
          <p class="section-title">Moves (first 20)</p>
          <div class="moves-grid">${movesHTML}</div>
        </div>

      </div>
    </div>
  `;
}
