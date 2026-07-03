import { chromium } from "playwright";
import logger from "../utils/logger.js";

let browser;

export const initBrowser = async () => {
  if (!browser) {
    logger.info("Launching Playwright browser...");
    browser = await chromium.launch({
      headless: true
    });
    logger.info("Playwright browser launched.");
  }

  return browser;
};

export const getBrowser = async () => {
  if (!browser) {
    return await initBrowser();
  }

  return browser;
};

export const closeBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info("Playwright browser closed.");
  }
};