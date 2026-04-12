import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

/**
 * Parse the HTML page from dealabs.com and extract deals
 * @param  {String} data - html response
 * @return {Array} list of deals
 */
const parse = data => {
  const $ = cheerio.load(data);

  const deals = [];

  // Each deal on dealabs is inside an article tag with this class
  $('article.thread').each((i, element) => {
    const el = $(element);

    // Title of the deal
    const title = el.find('strong.thread-title').text().trim();

    // Link to the deal page
    const link = el.find('a.thread-title--overflow').attr('href') || '';

    // Current price (ex: "29,99 €" → 29.99)
    const priceText = el.find('span.thread-price').first().text().trim();
    const price = parseFloat(priceText.replace(',', '.').replace(/[^\d.]/g, ''));

    // Original price before discount
    const retailText = el.find('span.mute--text').first().text().trim();
    const retail = parseFloat(retailText.replace(',', '.').replace(/[^\d.]/g, ''));

    // Discount percentage (ex: "-50%" → 50)
    const discountText = el.find('span.cept-discount-badge').text().trim();
    const discount = Math.abs(parseInt(discountText.replace(/[^\d]/g, '')));

    // Temperature (popularity score, ex: "1 234°" → 1234)
    const tempText = el.find('span.vote-temp').text().trim();
    const temperature = parseInt(tempText.replace(/[^\d]/g, '')) || 0;

    // Number of comments
    const commentsText = el.find('a.cept-comments-btn span').first().text().trim();
    const comments = parseInt(commentsText.replace(/[^\d]/g, '')) || 0;

    // Publication date (unix timestamp stored in data attribute)
    const published = parseInt(el.find('time').attr('datetime')) || 0;

    // Deal image
    const photo = el.find('img.thread-image').attr('src') || '';

    // Community name
    const community = 'Dealabs';

    // Only add the deal if it has at least a title and a link
    if (title && link) {
      deals.push({
        discount,
        price,
        retail,
        temperature,
        comments,
        published,
        title,
        link,
        photo,
        community,
        'uuid': uuidv5(link, uuidv5.URL)
      });
    }
  });

  return deals;
};

/**
 * Scrape Lego deals from a given dealabs URL
 * @param {String} url - url to scrape (default: lego group page)
 * @returns {Array} list of deals
 */
const scrape = async (url = 'https://www.dealabs.com/groupe/lego') => {
  const response = await fetch(url, {
    headers: {
      // We pretend to be a real browser so dealabs doesn't block us
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });

  if (response.ok) {
    const body = await response.text();
    return parse(body);
  }

  console.error('Erreur lors du fetch dealabs:', response.status, response.statusText);
  return null;
};

export { scrape };