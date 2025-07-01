const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const url = process.env.LINKEDIN_COMPANY_URL;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Placeholder parsing (scraping won’t fully work yet)
    const title = $('title').text();
    res.status(200).json({ title });
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape LinkedIn' });
  }
};
