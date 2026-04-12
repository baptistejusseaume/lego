'use strict';

// ============================================================
// GLOBAL STATE
// ============================================================

let currentDeals = [];
let currentSales = [];
let currentPagination = {};
let favorites = JSON.parse(localStorage.getItem('lego-favorites')) || [];

// ============================================================
// DOM SELECTORS
// ============================================================

// Controls
const selectShow     = document.querySelector('#show-select');
const selectSort     = document.querySelector('#sort-select');
const btnPageSelect  = document.querySelector('#page-select-btn');

// Filters
const filterDiscount  = document.querySelector('#filter-discount');
const filterComments  = document.querySelector('#filter-comments');
const filterHot       = document.querySelector('#filter-hot');
const filterFavorites = document.querySelector('#filter-favorites');

// Set ID search
const inputLegoSetId = document.querySelector('#lego-set-id-select');
const btnSearchSet   = document.querySelector('#search-btn');
const noResultError  = document.querySelector('#no-result-error');

// Sections
const sectionDeals      = document.querySelector('#deals');
const sectionVinted     = document.querySelector('#vinted-list');
const sectionIndicators = document.querySelector('#indicators');

// Indicators
const spanNbDeals  = document.querySelector('#nbDeals');
const spanNbSales  = document.querySelector('#nbSales');
const spanAvgPrice = document.querySelector('#avgPrice');
const spanP5Price  = document.querySelector('#p5Price');
const spanP25Price = document.querySelector('#p25Price');
const spanP50Price = document.querySelector('#p50Price');
const spanLifetime = document.querySelector('#lifetimeValue');

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Compute the p-th percentile of a numeric array
 * @param {number[]} arr
 * @param {number} p - percentile (e.g. 5, 25, 50)
 * @returns {number}
 */
const calculatePercentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
};

/**
 * Compute the average of a numeric array
 * @param {number[]} arr
 * @returns {string} - rounded to 2 decimal places
 */
const calculateAverage = (arr) => {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return (sum / arr.length).toFixed(2);
};

/**
 * Compute the lifetime (in days) between oldest and newest published item
 * @param {Object[]} items - items with a `published` timestamp
 * @returns {number}
 */
const calculateLifetime = (items) => {
  if (items.length < 2) return 0;
  const dates = items.map(item => item.published);
  const maxDate = Math.max(...dates);
  const minDate = Math.min(...dates);
  return Math.ceil((maxDate - minDate) / (60 * 60 * 24));
};

// ============================================================
// FETCH FUNCTIONS
// ============================================================

/**
 * Fetch deals from the API
 * @param {number} page
 * @param {number} size
 * @returns {Object} { result, meta }
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`);
    const body = await response.json();
    if (body.success !== true) {
      console.error(body);
      return { result: [], meta: currentPagination };
    }
    return body.data;
  } catch (error) {
    console.error(error);
    return { result: [], meta: currentPagination };
  }
};

/**
 * Fetch Vinted sales for a given Lego set ID
 * @param {string} id - Lego set ID
 * @returns {Object[]}
 */
const fetchSales = async (id) => {
  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${id}`);
    const body = await response.json();
    if (body.success !== true) {
      console.error(body);
      return [];
    }
    return body.data.result || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// ============================================================
// STATE MUTATORS
// ============================================================

/**
 * Update currentDeals and currentPagination
 * @param {Object} data - { result, meta }
 * @param {boolean} append - if true, append deals instead of replacing
 */
const setCurrentDeals = ({ result, meta }, append = false) => {
  currentDeals = append ? [...currentDeals, ...result] : result;
  currentPagination = meta;
};

/**
 * Feature 13 - Toggle a deal as favorite and persist to localStorage
 * @param {string} uuid
 */
const toggleFavorite = (uuid) => {
  const index = favorites.indexOf(uuid);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(uuid);
  }
  localStorage.setItem('lego-favorites', JSON.stringify(favorites));
  render();
};

// ============================================================
// FILTERING & SORTING
// ============================================================

/**
 * Apply active filters and sort to currentDeals
 * @returns {Object[]} filtered and sorted deals
 */
const getFilteredAndSortedDeals = () => {
  let filtered = [...currentDeals];

  // Feature 2 - Filter by best discount (> 50%)
  if (filterDiscount.checked) {
    filtered = filtered.filter(deal => deal.discount > 50);
  }

  // Feature 3 - Filter by most commented (> 15 comments)
  if (filterComments.checked) {
    filtered = filtered.filter(deal => deal.comments > 15);
  }

  // Feature 4 - Filter by hot deals (temperature > 100)
  if (filterHot.checked) {
    filtered = filtered.filter(deal => deal.temperature > 100);
  }

  // Feature 14 - Filter by favorites
  if (filterFavorites.checked) {
    filtered = filtered.filter(deal => favorites.includes(deal.uuid));
  }

  // Feature 5 & 6 - Sort by price or date
  const sortType = selectSort.value;
  filtered.sort((a, b) => {
    switch (sortType) {
      case 'price-asc':  return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'date-asc':   return a.published - b.published; // oldest first
      case 'date-desc':  return b.published - a.published; // newest first
      default:           return b.temperature - a.temperature;
    }
  });

  return filtered;
};

// ============================================================
// RENDER FUNCTIONS
// ============================================================

/**
 * Feature 11 - Render the list of deals
 * Feature 13 - Attach favorite toggle buttons
 * @param {Object[]} deals
 */
const renderDeals = (deals) => {
  if (deals.length === 0) {
    sectionDeals.innerHTML = '<p style="padding:20px; color:#70757a;">Aucun deal trouvé avec ces critères.</p>';
    return;
  }

  sectionDeals.innerHTML = deals.map(deal => {
    const isFav = favorites.includes(deal.uuid);
    return `
      <article class="deal-item">
        <button class="fav-btn ${isFav ? 'active' : ''}" data-uuid="${deal.uuid}" title="Sauvegarder en favori">♥</button>
        <div class="deal-image">
          <img src="${deal.photo}" alt="${deal.title}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.style.display='none'">
        </div>
        <div class="deal-content">
          <div>
            <div class="deal-metrics">
              <span class="temp-badge ${deal.temperature > 100 ? '' : 'cold'}">${deal.temperature > 100 ? '🔥' : '❄️'} ${deal.temperature}°</span>
              <span>💬 ${deal.comments} comm.</span>
              <span>🕒 ${new Date(deal.published * 1000).toLocaleDateString()}</span>
            </div>
            <a href="${deal.link}" target="_blank" class="deal-title">${deal.title}</a>
            <div class="deal-price-row">
              <span class="price-current">${deal.price}€</span>
              ${deal.retail && deal.retail > 0 ? `<span class="price-old">${deal.retail}€</span>` : ''}
              ${deal.discount ? `<span class="discount-badge">-${deal.discount}%</span>` : ''}
            </div>
          </div>
          <div class="deal-footer">
            <a href="${deal.link}" target="_blank" class="btn-view">Voir le deal ↗</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFavorite(e.currentTarget.dataset.uuid);
    });
  });
};

/**
 * Feature 7  - Display Vinted sales
 * Feature 12 - Open sold item link in new tab
 * @param {Object[]} sales
 */
const renderSales = (sales) => {
  if (sales.length === 0) {
    sectionVinted.innerHTML = '<li><p style="color:#70757a; font-size:13px; padding: 10px 0;">Recherchez un Set ID pour voir les ventes Vinted.</p></li>';
    return;
  }

  sectionVinted.innerHTML = sales.slice(0, 10).map(sale => `
    <li>
      <div>
        <span class="vinted-title">${sale.title}</span>
        <span class="vinted-meta">Date : ${new Date(sale.published * 1000).toLocaleDateString()}</span>
        <a href="${sale.link}" target="_blank" class="vinted-link">Voir sur Vinted ↗</a>
      </div>
      <div class="vinted-price">${sale.price?.amount ?? sale.price}€</div>
    </li>
  `).join('');
};

/**
 * Feature 8  - Show total number of deals and sales
 * Feature 9  - Show average, p5, p25, p50 price indicators
 * Feature 10 - Show lifetime value
 * @param {Object[]} filteredDeals
 * @param {Object[]} sales
 */
const renderIndicators = (filteredDeals, sales) => {
  const hasSearch = inputLegoSetId.value.trim() !== '';
  sectionIndicators.style.display = hasSearch ? 'block' : 'none';
  if (!hasSearch) return;

  // Feature 8
  spanNbDeals.innerHTML = filteredDeals.length;
  spanNbSales.innerHTML = sales.length;

  // Feature 9
  const salesPrices = sales.map(s => parseFloat(s.price?.amount ?? s.price)).filter(p => !isNaN(p));
  spanAvgPrice.innerHTML = salesPrices.length ? `${calculateAverage(salesPrices)} €`          : '--- €';
  spanP5Price.innerHTML  = salesPrices.length ? `${calculatePercentile(salesPrices, 5)} €`    : '--- €';
  spanP25Price.innerHTML = salesPrices.length ? `${calculatePercentile(salesPrices, 25)} €`   : '--- €';
  spanP50Price.innerHTML = salesPrices.length ? `${calculatePercentile(salesPrices, 50)} €`   : '--- €';

  // Feature 10
  const lifetime = calculateLifetime(sales);
  spanLifetime.innerHTML = lifetime > 0 ? `${lifetime} jours` : '---';
};

/**
 * Feature 1 - Show/hide the "load more" pagination button
 */
const renderPaginationBtn = () => {
  const { currentPage, pageCount } = currentPagination;
  if (currentPage < pageCount) {
    btnPageSelect.innerHTML = `↻ Charger plus de deals (Page ${currentPage} / ${pageCount})`;
    btnPageSelect.style.display = 'block';
  } else {
    btnPageSelect.style.display = 'none';
  }
};

/**
 * Main render — call all render functions
 */
const render = () => {
  const filteredDeals = getFilteredAndSortedDeals();
  renderDeals(filteredDeals);
  renderSales(currentSales);
  renderIndicators(filteredDeals, currentSales);
  renderPaginationBtn();
};

// ============================================================
// EVENT LISTENERS
// ============================================================

// Feature 0 - Change number of deals displayed
selectShow.addEventListener('change', async (event) => {
  const size = parseInt(event.target.value);
  const data = await fetchDeals(1, size);
  setCurrentDeals(data, false);
  render();
});

// Feature 1 - Load more deals (next page)
btnPageSelect.addEventListener('click', async () => {
  const { currentPage, pageCount } = currentPagination;
  if (currentPage < pageCount) {
    const size = parseInt(selectShow.value);
    const data = await fetchDeals(currentPage + 1, size);
    setCurrentDeals(data, true);
    render();
  }
});

// Features 2, 3, 4, 14 - Checkbox filters
[filterDiscount, filterComments, filterHot, filterFavorites].forEach(checkbox => {
  checkbox.addEventListener('change', () => render());
});

// Features 5 & 6 - Sort select
selectSort.addEventListener('change', () => render());

// Feature 7 - Search Vinted sales by Set ID
btnSearchSet.addEventListener('click', async () => {
  const setId = inputLegoSetId.value.trim();
  if (setId) {
    currentSales = await fetchSales(setId);
    noResultError.style.display = currentSales.length === 0 ? 'block' : 'none';
  } else {
    currentSales = [];
    noResultError.style.display = 'none';
  }
  render();
});

// Allow pressing Enter to trigger search
inputLegoSetId.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') btnSearchSet.click();
});

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  sectionIndicators.style.display = 'none';
  const size = parseInt(selectShow.value) || 6;
  const data = await fetchDeals(1, size);
  setCurrentDeals(data, false);
  render();
});