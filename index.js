const express = require('express');
const puppeteer = require('puppeteer');
const { URL } = require('url');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/search', async (req, res) => {
  const userInput = req.body.query.replace(/\s+/g, '+');
  const url = `https://libgen.rs/fiction/?q=${userInput}&criteria=&language=English&format=epub`;

  try {
    const browser = await puppeteer.launch({
        args: [
            "--disable-setupuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
        ],
        executablePath: process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH 
          : puppeteer.executablePath(),
      });
    const page = await browser.newPage();
    await page.goto(url);

    const urls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map(link => link.href);
    });

    console.log(url)
    console.log("All URLs found on libgen.rs:");
    urls.forEach(u => console.log(u));

    let matchedUrl = '';
    for (const u of urls) {
      const parsedUrl = new URL(u);
      if (parsedUrl.hostname === 'library.lol') {
        matchedUrl = u;
        break;
      }
    }

    if (matchedUrl) {
      const downloadPage = await browser.newPage();
      await downloadPage.goto(matchedUrl);

      const libraryUrls = await downloadPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(link => link.href);
      });

      console.log("All URLs found on library.lol:");
      libraryUrls.forEach(u => console.log(u));

      const downloadUrl = libraryUrls.find(u => u.startsWith('https://download.library.lol'));

      if (downloadUrl) {
        console.log('Download URL found:', downloadUrl);
        console.log('Download Page found:', matchedUrl);
        matchedUrl = matchedUrl.replace("http://", "https://");
        res.send(`${matchedUrl}`);
      } else {
        console.log('No download URL found on library.lol.');
        res.status(404).send('No download URL found on library.lol.');
      }
    } else {
      console.log('No library.lol URL found on libgen.rs.');
      res.status(404).send('No library.lol URL found on libgen.rs.');
    }

    await browser.close();
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
