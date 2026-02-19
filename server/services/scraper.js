const express = require('express');
const cheerio = require('cheerio');

const router = express.Router();
const SCRAPE_TIMEOUT = 10000;

async function scrapeProductURL(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    if (url.includes('amazon.')) {
      return scrapeAmazon($, url);
    } else if (isShopify($)) {
      return scrapeShopify($, url);
    } else {
      return scrapeGeneric($, url);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Scraping timed out after 10 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
    price,
    description,
    features,
    images,
    reviews,
    rating,
    url,
    platform: 'amazon',
  };
}

function scrapeShopify($, url) {
  const name = $('h1.product-single__title, h1.product__title, .product-title h1, h1').first().text().trim();
  const price = $('span.price, .product-price, .product__price, [data-product-price]').first().text().trim();
  const description = $('div.product-single__description, .product-description, .product__description, [data-product-description]')
    .first().text().trim();

  const features = [];
  $('div.product-single__description li, .product-description li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) features.push(text);
  });

  const images = [];
  $('img.product-single__photo, img.product__photo, .product-image img, [data-product-media] img').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src) images.push(src.startsWith('//') ? `https:${src}` : src);
  });

  return {
    name: name || 'Unknown Product',
    price,
    description,
    features: features.slice(0, 5),
    images,
    reviews: [],
    rating: '',
    url,
    platform: 'shopify',
  };
}

function scrapeGeneric($, url) {
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');

  const name = ogTitle
    || $('h1').first().text().trim()
    || $('title').text().trim();

  const description = ogDesc
    || $('meta[name="description"]').attr('content')
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
  $('ul li, .features li, .benefits li').slice(0, 5).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) features.push(text);
  });

  return {
    name: name || 'Unknown Product',
    price: price || '',
    description: description || '',
    features,
    images: images.slice(0, 5),
    reviews: [],
    rating: '',
    url,
    platform: 'generic',
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
