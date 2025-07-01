const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
require('dotenv').config();

const COMPANY_PAGE_URL = 'https://www.linkedin.com/company/pragmatic-design-solutions-limited/';

module.exports = async (req, res) => {
  const { LINKEDIN_EMAIL, LINKEDIN_PASSWORD } = process.env;

  if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
    return res.status(400).json({ error: 'Missing credentials in environment variables' });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();

    // 1. Go to LinkedIn login
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

    // 2. Log in
    await page.type('#username', LINKEDIN_EMAIL, { delay: 50 });
    await page.type('#password', LINKEDIN_PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 3. Navigate to the company page
    await page.goto(COMPANY_PAGE_URL, { waitUntil: 'networkidle2' });

    // 4. Scroll to load posts
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    // 5. Extract posts
    const posts = await page.evaluate(() => {
      const postNodes = document.querySelectorAll('.feed-shared-update-v2');

      const extractMedia = (container) => {
        const images = Array.from(container.querySelectorAll('img')).map(img => img.src);
        const videos = Array.from(container.querySelectorAll('video')).map(vid => vid.src || vid.poster || '');
        return { images, videos };
      };

      const postArray = [];
      postNodes.forEach(post => {
        const textContent = post.innerText?.trim() || '';
        const likesText = post.querySelector('[aria-label*="like"]')?.innerText || '0';
        const media = extractMedia(post);

        postArray.push({
          text: textContent,
          likes: likesText,
          images: media.images,
          videos: media.videos,
        });
      });

      return postArray;
    });

    await browser.close();
    res.status(200).json({ posts });

  } catch (err) {
    console.error('Scraping failed:', err.message);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to scrape LinkedIn', details: err.message });
  }
};
