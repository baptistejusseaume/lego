import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

// Data sources
import SALES from './sources/vinted.json' with { type: 'json' };
import DEALS from './sources/avenuedelabrique.json' with { type: 'json' };

const PORT = 8092;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

// ============================================================
// GET / — Health check
// ============================================================
app.get('/', (request, response) => {
  response.send({ 'ack': true });
});

// ============================================================
// GET /deals/:id — Fetch a specific deal by uuid
// ============================================================
app.get('/deals/:id', (request, response) => {
  try {
    const { id } = request.params;

    // Find the deal with the matching uuid
    const deal = DEALS.find(d => d.uuid === id);

    if (!deal) {
      return response.status(404).json({
        'success': false,
        'data': null
      });
    }

    return response.status(200).json({
      'success': true,
      'data': deal
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({
      'success': false,
      'data': null
    });
  }
});

// ============================================================
// GET /deals/search — Search and filter deals
// Query params:
//   - limit  : number of deals to return (default: 12)
//   - price  : filter deals below this price
//   - date   : filter deals published after this timestamp
//   - filterBy: 'best-discount' | 'most-commented'
// ============================================================
app.get('/deals/search', (request, response) => {
  try {
    const { limit = 12, price, date, filterBy } = request.query;

    let results = [...DEALS];

    // Filter by price (keep deals below the given price)
    if (price) {
      results = results.filter(deal => deal.price <= parseFloat(price));
    }

    // Filter by date (keep deals published after the given timestamp)
    if (date) {
      results = results.filter(deal => deal.published >= parseInt(date));
    }

    // Filter by specific criteria
    if (filterBy === 'best-discount') {
      results = results.filter(deal => deal.discount > 50);
    } else if (filterBy === 'most-commented') {
      results = results.filter(deal => deal.comments > 15);
    }

    // Sort by price ascending
    results.sort((a, b) => a.price - b.price);

    // Apply limit
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
    return response.status(500).json({
      'success': false,
      'data': null
    });
  }
});

// ============================================================
// GET /sales/search — Search Vinted sales by lego set id
// Query params:
//   - limit     : number of sales to return (default: 12)
//   - legoSetId : filter by lego set id
// ============================================================
app.get('/sales/search', (request, response) => {
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  try {
    const { legoSetId, limit = 12 } = request.query;

    let result = SALES[legoSetId] || [];

    // Sort by date descending (most recent first)
    result.sort((a, b) => b.published - a.published);

    // Apply limit
    result = result.slice(0, parseInt(limit));

    return response.status(200).json({
      'success': true,
      'data': {
        'limit': parseInt(limit),
        'total': result.length,
        'result': result
      }
    });
  } catch (error) {
    console.error(error);
    return response.status(404).json({
      'success': false,
      'data': { 'result': [] }
    });
  }
});

// ============================================================
app.listen(PORT);
console.log(`📡 Running on port ${PORT}`);
