/* eslint-disable no-console, no-process-exit */
import * as fs from 'fs';
import * as avenuedelabrique from './websites/avenuedelabrique.js';
import * as dealabs from './websites/dealabs.js';
import * as vinted from './websites/vinted.js';

// ============================================================
// SCRAPING FUNCTIONS
// ============================================================

/**
 * Scrape deals from avenuedelabrique.com and log the result
 * @param {String} url
 */
async function scrapeADLB(url = 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego') {
  try {
    console.log(`🕵️  browsing ${url}`);
    const deals = await avenuedelabrique.scrape(url);
    console.log(deals);
    console.log(`✅ done — ${deals.length} deals found`);

    const outputPath = './sources/avenuedelabrique.json';
    fs.mkdirSync('./sources', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(deals, null, 2));
    console.log(`💾 Deals saved to ${outputPath}`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

/**
 * Scrape deals from dealabs.com and save the result to a JSON file
 * @param {String} url
 */
async function scrapeDealabs(url = 'https://www.dealabs.com/groupe/lego') {
  try {
    console.log(`🕵️  browsing ${url}`);
    const deals = await dealabs.scrape(url);

    if (!deals || deals.length === 0) {
      console.warn('⚠️  No deals found. The site may have blocked the request.');
      process.exit(1);
    }

    console.log(deals);
    console.log(`✅ done — ${deals.length} deals found`);

    const outputPath = './sources/dealabs.json';
    fs.mkdirSync('./sources', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(deals, null, 2));
    console.log(`💾 Deals saved to ${outputPath}`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

/**
 * Scrape current Vinted sales for a given Lego set ID
 * @param {String} legoId - Lego set ID (ex: "75192")
 */
async function scrapeVinted(legoId) {
  try {
    console.log(`🕵️  scraping lego set ${legoId} from vinted.fr`);
    const sales = await vinted.scrape(legoId);
    console.log(sales);
    console.log(`✅ done — ${sales.length} sales found`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// ============================================================
// ENTRY POINT
// Usage:
//   node sandbox.js                        → scrape dealabs (default)
//   node sandbox.js dealabs               → scrape dealabs
//   node sandbox.js dealabs <url>         → scrape dealabs with custom url
//   node sandbox.js adlb                  → scrape avenuedelabrique
//   node sandbox.js adlb <url>            → scrape avenuedelabrique with custom url
//   node sandbox.js vinted 75192          → scrape vinted for set 75192
// ============================================================

const [,, command, param] = process.argv;

if (command === 'adlb') {
  scrapeADLB(param); // param peut être undefined → utilisera l'URL par défaut
} else if (command === 'vinted') {
  scrapeVinted(param);
} else if (command === 'dealabs-local') {
  scrapeDealabsLocal(param);
} else if (command === 'dealabs') {
  scrapeDealabs(param);
} else if (command && command.startsWith('http')) {
  // Si on passe directement une URL complète
  scrapeDealabs(command);
} else {
  // Aucune commande reconnue → scrape dealabs par défaut
  scrapeDealabs();
}