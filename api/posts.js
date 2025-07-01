import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';

dotenv.config();

const COMPANY_PAGE_URL = 'https://www.linkedin.com/company/pragmatic-design-solutions-limited/';

export default async function handler(req, res) {
  const { LINKEDIN_EMAIL, LINKEDIN_PASSWORD } = process.env;

  if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
    return res.status(400).json({ error: 'Missing credentials in environment variables' });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    await page.type('#username', LINKEDIN_EMAIL, { delay: 50 });
    await page.type('#password', LINKEDIN_PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    await page.goto(COMPANY_PAGE_URL, { waitUntil: 'networkidle2' });

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    const posts = await page.evaluate(() => {
      const postNodes = document.querySelectorAll('.feed-shared-update-v2');

      const extractMedia = (container) => {
        const images = Array.from(container.querySelectorAll('img')).map(img => img.src);
        const videos = Array.from(container.querySelectorAll('video')).map(vid => vid.src || vid.poster || '');
        return { images, videos };
      };

      return Array.from(postNodes).map(post => ({
        text: post.innerText?.trim() || '',
        likes: post.querySelector('[aria-label*="like"]')?.innerText || '0',
        ...extractMedia(post),
      }));
    });

    await browser.close();
    res.status(200).json({ posts });

  } catch (err) {
    if (browser) await browser.close();
    console.error(err);
    res.status(500).json({ error: 'Failed to scrape', details: err.message });
  }
}
