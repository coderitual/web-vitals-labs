const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const argv = require('yargs').argv;
const chromeLauncher = require('chrome-launcher');
const reportGenerator = require('lighthouse/report/report-generator');
const request = require('request');
const util = require('util');

async function lighthouseFromPuppeteer(url, options, config = null) {
  // Launch chrome using chrome-launcher
  const chrome = await chromeLauncher.launch(options);
  options.port = chrome.port;

  // Connect chrome-launcher to puppeteer
  const resp = await util.promisify(request)(
    `http://localhost:${options.port}/json/version`,
  );
  const { webSocketDebuggerUrl } = JSON.parse(resp.body);
  const browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
  });

  // Run Lighthouse
  const { lhr, report } = await lighthouse(url, options, config);

  const json = reportGenerator.generateReport(lhr, 'json');

  const audits = JSON.parse(json).audits; // Lighthouse audits

  const first_contentful_paint =
    audits['first-contentful-paint'].numericValue?.toFixed(2);
  const largest_contentful_paint =
    audits['largest-contentful-paint'].numericValue?.toFixed(2);
  const speed_index = audits['speed-index'].numericValue?.toFixed(2);
  const max_potential_fid =
    audits['max-potential-fid'].numericValue?.toFixed(2);
  const cumulative_layout_shift =
    audits['cumulative-layout-shift'].numericValue?.toFixed(4);
  const total_blocking_time =
    audits['total-blocking-time'].numericValue?.toFixed(2);
  const time_to_interactive = audits['interactive'].numericValue?.toFixed(2);

  console.log(`\n
     Lighthouse metrics: 
     URL: ${url},
     🎨 First Contentful Paint: ${first_contentful_paint}, 
     📱 Cumulative Layout Shift: ${cumulative_layout_shift},
     🌄 Largest Contentful Paint: ${largest_contentful_paint},
     ⏳ Max Potential FID: ${max_potential_fid},
     ⌛️ Total Blocking Time: ${total_blocking_time},
     👆 Time To Interactive: ${time_to_interactive}`);

  await browser.disconnect();
  await chrome.kill();

  return {
    first_contentful_paint,
    cumulative_layout_shift,
    largest_contentful_paint,
    max_potential_fid,
    total_blocking_time,
    time_to_interactive,
  };
}

module.exports = lighthouseFromPuppeteer;
