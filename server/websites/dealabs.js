import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

const parse = html => {
  const $ = cheerio.load(html);
  const deals = [];

  $('div.js-threadList article').each((i, element) => {
    const el = $(element);
    
    // Récupérer l'attribut data-vue3 ou data-vue2
    const vueData = el.find('div.js-vue3').attr('data-vue3') 
                || el.find('div[data-vue2]').attr('data-vue2')
                || el.attr('data-vue3');
    
    if (!vueData) return;

    let data;
    try {
      data = JSON.parse(vueData);
    } catch (e) {
      return;
    }

    // Extraire les propriétés du deal
    const thread = data.thread || data.props?.thread || {};
    const title = thread.title || '';
    const link = thread.link || '';
    const fullLink = link.startsWith('http') ? link : `https://www.dealabs.com${link}`;

    // Prix actuel
    const price = thread.price || 0;
    
    // Prix de référence (barré)
    let retail = thread.retailPrice || thread.nextBestPrice || 0;
    
    // 🔥 Si retail est 0, on le met égal à price (pas de prix barré)
    if (retail === 0) {
      retail = price;
    }

    // 🔥 Calcul du discount (priorité au discount fourni, sinon calculé)
    let discount = thread.discount || 0;
    if (discount === 0 && retail > 0 && price < retail) {
      discount = Math.round(((retail - price) / retail) * 100);
    }

    // Si le discount calculé est négatif ou nul, on le met à 0
    if (discount < 0) discount = 0;

    const temperature = thread.temperature || 0;
    const comments = thread.commentCount || 0;
    const published = thread.publishedAt || Date.now() / 1000;

    let photo = '';
    if (thread.mainImage?.path && thread.mainImage?.name) {
      photo = `https://static-pepper.dealabs.com/${thread.mainImage.path}/${thread.mainImage.name}`;
    } else if (thread.image) {
      photo = thread.image;
    }

    const idMatch = title.match(/\b(\d{4,6})\b/);
    const id = idMatch ? idMatch[1] : null;

    deals.push({
      discount,
      price,
      retail,
      temperature,
      comments,
      published,
      title,
      link: fullLink,
      photo,
      community: 'Dealabs',
      expired: thread.isExpired || false,
      id,
      uuid: uuidv5(fullLink, uuidv5.URL)
    });
  });

  return deals;
};

const scrape = async (url = 'https://www.dealabs.com/groupe/lego') => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    }
  });

  if (response.ok) {
    const html = await response.text();
    return parse(html);
  }

  console.error('❌ Erreur fetch dealabs:', response.status);
  return [];
};

export { scrape, parse };