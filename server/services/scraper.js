const express = require('express');
const cheerio = require('cheerio');

const router = express.Router();
const SCRAPE_TIMEOUT = 10000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/json',
};

async function scrapeProductURL(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract JSON-LD structured data (works across most modern sites)
    const jsonLd = extractJsonLd($);

    let result;
    if (url.includes('amazon.')) {
      result = scrapeAmazon($, url);
    } else if (isShopify($)) {
      result = await scrapeShopify($, url, jsonLd);
    } else {
      result = scrapeGeneric($, url, jsonLd);
    }

    // Merge JSON-LD data as fallback for any missing fields
    if (jsonLd) {
      if (!result.name || result.name === 'Unknown Product') result.name = jsonLd.name || result.name;
      if (!result.description) result.description = jsonLd.description || '';
      if (!result.price) {
        const offer = jsonLd.offers?.[0] || jsonLd.offers || {};
        result.price = offer.price ? `$${offer.price}` : '';
      }
      if (!result.images?.length && jsonLd.image) {
        const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
        result.images = imgs.slice(0, 5);
      }
      if (!result.rating && jsonLd.aggregateRating?.ratingValue) {
        result.rating = `${jsonLd.aggregateRating.ratingValue} / 5`;
      }
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Scraping timed out after 10 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract Product JSON-LD from the page */
function extractJsonLd($) {
  let product = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    try {
      const data = JSON.parse($(el).html());
      // Could be a single object or an array
      const items = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const item of items) {
        if (item['@type'] === 'Product') { product = item; return; }
      }
    } catch {}
  });
  return product;
}

function isShopify($) {
  return $('meta[name="shopify-checkout-api-token"]').length > 0
    || $('link[href*="cdn.shopify"]').length > 0
    || $('script[src*="cdn.shopify"]').length > 0;
}

function scrapeAmazon($, url) {
  const name = $('#productTitle').text().trim()
    || $('h1.a-size-large span').first().text().trim();

  const priceWhole = $('.a-price .a-price-whole').first().text().trim();
  const priceFraction = $('.a-price .a-price-fraction').first().text().trim();
  const price = priceWhole ? `$${priceWhole}${priceFraction}` : '';

  const description = $('#productDescription p').text().trim()
    || $('#feature-bullets .a-list-item').map((_, el) => $(el).text().trim()).get().join(' ');

  const features = $('#feature-bullets .a-list-item')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(t => t.length > 0)
    .slice(0, 5);

  const images = [];
  $('img[data-a-image-name="landingImage"], #imgBlkFront, #landingImage').each((_, el) => {
    const src = $(el).attr('data-old-hires') || $(el).attr('src');
    if (src) images.push(src);
  });

  const reviews = [];
  $('[data-hook="review-body"] span').slice(0, 5).each((_, el) => {
    reviews.push($(el).text().trim());
  });

  const rating = $('span[data-hook="rating-out-of-text"]').text().trim()
    || $('i.a-icon-star span.a-icon-alt').first().text().trim();

  return {
    name: name || 'Unknown Product',
    price, description, features, images, reviews, rating,
    url, platform: 'amazon',
  };
}

async function scrapeShopify($, url, jsonLd) {
  // Strategy 1: Try Shopify product JSON API (most reliable)
  let shopifyData = null;
  const productJsonUrl = url.replace(/\?.*$/, '').replace(/\/$/, '') + '.json';
  try {
    const jsonRes = await fetch(productJsonUrl, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
    if (jsonRes.ok) {
      const json = await jsonRes.json();
      shopifyData = json.product;
    }
  } catch {}

  if (shopifyData) {
    const variant = shopifyData.variants?.[0];
    const descHtml = shopifyData.body_html || '';
    const desc$ = cheerio.load(descHtml);
    const descText = desc$.text().trim();

    // Extract features from description list items
    const features = [];
    desc$('li').each((_, el) => {
      const t = desc$(el).text().trim();
      if (t && t.length < 200) features.push(t);
    });

    // If no list items, try to extract bullet-like lines from text
    if (!features.length && descText) {
      descText.split(/\n|•|✓|✔|—|–/).forEach(line => {
        const t = line.trim();
        if (t && t.length > 5 && t.length < 200) features.push(t);
      });
    }

    const images = (shopifyData.images || []).map(img => img.src).slice(0, 5);

    return {
      name: shopifyData.title || 'Unknown Product',
      price: variant?.price ? `$${variant.price}` : '',
      description: descText,
      features: features.slice(0, 5),
      images,
      reviews: [],
      rating: '',
      url,
      platform: 'shopify',
    };
  }

  // Strategy 2: CSS selectors (broader set for modern themes)
  const name = $(
    'h1.product-single__title, h1.product__title, .product-title h1, ' +
    '.product__heading, .product-info h1, [data-product-title], h1'
  ).first().text().trim();

  const price = $(
    'span.price, .product-price, .product__price, [data-product-price], ' +
    '.price--main, .current-price, .money, [class*="price"] [class*="money"]'
  ).first().text().trim();

  const description = $(
    'div.product-single__description, .product-description, .product__description, ' +
    '[data-product-description], .product__text, .product-info__description, ' +
    '.product__body, .rte'
  ).first().text().trim();

  const features = [];
  $(
    'div.product-single__description li, .product-description li, .product__description li, ' +
    '.product__text li, .rte li, [data-product-description] li'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) features.push(text);
  });

  const images = [];
  $(
    'img.product-single__photo, img.product__photo, .product-image img, ' +
    '[data-product-media] img, .product__media img, .product-gallery img'
  ).each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src) images.push(src.startsWith('//') ? `https:${src}` : src);
  });

  return {
    name: name || 'Unknown Product',
    price, description,
    features: features.slice(0, 5),
    images: images.slice(0, 5),
    reviews: [], rating: '',
    url, platform: 'shopify',
  };
}

function scrapeGeneric($, url, jsonLd) {
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');

  const name = ogTitle
    || $('h1').first().text().trim()
    || $('title').text().trim();

  const description = ogDesc
    || $('meta[name="description"]').attr('content')
    || $('[itemprop="description"]').first().text().trim()
    || $('p').first().text().trim();

  const price = $('[class*="price"], [data-price], [itemprop="price"]').first().text().trim()
    || $('span:contains("$")').first().text().trim();

  const images = [];
  if (ogImage) images.push(ogImage);
  $('[itemprop="image"], .product-image img, .product img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) images.push(src.startsWith('//') ? `https:${src}` : src);
  });

  const features = [];
  $('[itemprop="description"] li, .product-details li, .features li, .benefits li').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) features.push(text);
  });
  // Broader fallback if no features found yet
  if (!features.length) {
    $('ul li').slice(0, 10).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 200) features.push(text);
    });
  }

  return {
    name: name || 'Unknown Product',
    price: price || '',
    description: description || '',
    features: features.slice(0, 5),
    images: images.slice(0, 5),
    reviews: [], rating: '',
    url, platform: 'generic',
  };
}

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const product = await scrapeProductURL(url);
    res.json({ success: true, product });
  } catch (error) {
    console.error('Scrape error:', error.message);
    res.json({
      success: false,
      error: error.message,
      message: 'Could not scrape this URL. Please enter product details manually.',
    });
  }
});

module.exports = { scrapeProductURL, router };
