import { readFileSync } from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

// Charge les données directement — adapte le chemin si besoin
const SALES = JSON.parse(readFileSync('./sources/vinted.json', 'utf-8'));
const DEALS = JSON.parse(readFileSync('./sources/dealabs.json', 'utf-8'));

console.log(`📂 ${DEALS.length} deals chargés depuis dealabs.json`);

const PORT = 8092;
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

// GET / — Health check
app.get('/', (request, response) => {
  response.send({ 'ack': true });
});

// GET /deals/search — DOIT être AVANT /deals/:id
app.get('/deals/search', (request, response) => {
  try {
    const { limit = 12, price, date, filterBy } = request.query;

    let results = [...DEALS];

    if (price) {
      results = results.filter(deal => deal.price <= parseFloat(price));
    }

    if (date) {
      results = results.filter(deal => deal.published >= parseInt(date));
    }

    if (filterBy === 'best-discount') {
      results = results.filter(deal => deal.discount > 50);
    } else if (filterBy === 'most-commented') {
      results = results.filter(deal => deal.comments > 15);
    }

    results.sort((a, b) => a.price - b.price);
    results = results.slice(0, parseInt(limit));

    return response.status(200).json({
      'success': true,
      'data': {
        'limit': parseInt(limit),
        'total': results.length,
        'results': results
      }
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ 'success': false, 'data': null });
  }
});

// GET /deals/:id — DOIT être APRÈS /deals/search
app.get('/deals/:id', (request, response) => {
  try {
    const { id } = request.params;
    const deal = DEALS.find(d => d.uuid === id);

    if (!deal) {
      return response.status(404).json({ 'success': false, 'data': null });
    }

    return response.status(200).json({ 'success': true, 'data': deal });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ 'success': false, 'data': null });
  }
});

// GET /sales/search
app.get('/sales/search', (request, response) => {
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  try {
    const { legoSetId, limit = 12 } = request.query;
    let result = SALES[legoSetId] || [];

    result.sort((a, b) => b.published - a.published);
    result = result.slice(0, parseInt(limit));

    return response.status(200).json({
      'success': true,
      'data': { 'limit': parseInt(limit), 'total': result.length, 'result': result }
    });
  } catch (error) {
    console.error(error);
    return response.status(404).json({ 'success': false, 'data': { 'result': [] } });
  }
});

app.listen(PORT);
console.log(`📡 Running on port ${PORT}`);