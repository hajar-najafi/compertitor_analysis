const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const { config } = require('../config');

class WebsiteMonitor {
  constructor() {
    this.browser = null;
    this.snapshotsDir = path.join(config.paths.reports, 'snapshots');
    this.ensureSnapshotsDir();
  }

  async ensureSnapshotsDir() {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create snapshots directory', error);
    }
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Monitor a competitor's website for changes
   * @param {Object} competitor - Competitor object
   * @returns {Object} Monitoring results
   */
  async monitorWebsite(competitor) {
    const startTime = Date.now();
    logger.competitor(competitor.name, `Starting website monitoring for ${competitor.website}`);

    try {
      const results = {
        competitor: competitor.name,
        website: competitor.website,
        timestamp: new Date().toISOString(),
        changes: [],
        errors: [],
        metrics: {}
      };

      // Get current page content
      const currentContent = await this.getPageContent(competitor.website);

      if (!currentContent) {
        results.errors.push('Failed to fetch page content');
        return results;
      }

      // Generate content hash
      const contentHash = this.generateHash(currentContent.html);

      // Load previous snapshot
      const previousSnapshot = await this.loadPreviousSnapshot(competitor.id);

      if (previousSnapshot) {
        // Compare with previous snapshot
        const changes = this.detectChanges(currentContent, previousSnapshot);
        results.changes = changes;

        // Calculate metrics
        results.metrics = this.calculateMetrics(currentContent, previousSnapshot);
      }

      // Save current snapshot
      await this.saveSnapshot(competitor.id, {
        ...currentContent,
        hash: contentHash,
        timestamp: new Date().toISOString()
      });

      const duration = Date.now() - startTime;
      logger.competitor(competitor.name, `Website monitoring completed in ${duration}ms`, {
        changes: results.changes.length,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      logger.error(`Website monitoring failed for ${competitor.name}`, error);
      return {
        competitor: competitor.name,
        website: competitor.website,
        timestamp: new Date().toISOString(),
        changes: [],
        errors: [error.message],
        metrics: {}
      };
    }
  }

  /**
   * Get page content using Puppeteer
   * @param {string} url - Website URL
   * @returns {Object} Page content and metadata
   */
  async getPageContent(url) {
    const browser = await this.initBrowser();

    try {
      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to page with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Get page content
      const html = await page.content();
      const title = await page.title();
      const url = page.url();

      // Extract text content
      const textContent = await page.evaluate(() => {
        return document.body.innerText;
      });

      // Get page metrics
      const metrics = await page.evaluate(() => {
        return {
          wordCount: document.body.innerText.split(/\s+/).length,
          linkCount: document.querySelectorAll('a').length,
          imageCount: document.querySelectorAll('img').length,
          headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
        };
      });

      await page.close();

      return {
        html,
        title,
        url,
        textContent,
        metrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to get page content for ${url}`, error);
      return null;
    }
  }

  /**
   * Generate hash for content comparison
   * @param {string} content - HTML content
   * @returns {string} Content hash
   */
  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load previous snapshot for comparison
   * @param {string} competitorId - Competitor ID
   * @returns {Object|null} Previous snapshot
   */
  async loadPreviousSnapshot(competitorId) {
    try {
      const snapshotPath = path.join(this.snapshotsDir, `${competitorId}.json`);
      const snapshotData = await fs.readFile(snapshotPath, 'utf8');
      return JSON.parse(snapshotData);
    } catch (error) {
      // No previous snapshot exists
      return null;
    }
  }

  /**
   * Save current snapshot
   * @param {string} competitorId - Competitor ID
   * @param {Object} snapshot - Snapshot data
   */
  async saveSnapshot(competitorId, snapshot) {
    try {
      const snapshotPath = path.join(this.snapshotsDir, `${competitorId}.json`);
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      logger.error(`Failed to save snapshot for ${competitorId}`, error);
    }
  }

  /**
   * Detect changes between current and previous content
   * @param {Object} current - Current content
   * @param {Object} previous - Previous content
   * @returns {Array} List of changes
   */
  detectChanges(current, previous) {
    const changes = [];

    // Check if content hash changed
    if (current.hash !== previous.hash) {
      changes.push({
        type: 'content',
        description: 'Page content has changed',
        severity: 'medium'
      });
    }

    // Check title changes
    if (current.title !== previous.title) {
      changes.push({
        type: 'title',
        description: `Title changed from "${previous.title}" to "${current.title}"`,
        severity: 'high'
      });
    }

    // Check URL changes (redirects)
    if (current.url !== previous.url) {
      changes.push({
        type: 'url',
        description: `URL changed from "${previous.url}" to "${current.url}"`,
        severity: 'high'
      });
    }

    // Check metrics changes
    const metricChanges = this.compareMetrics(current.metrics, previous.metrics);
    changes.push(...metricChanges);

    return changes;
  }

  /**
   * Compare metrics between current and previous content
   * @param {Object} current - Current metrics
   * @param {Object} previous - Previous metrics
   * @returns {Array} Metric changes
   */
  compareMetrics(current, previous) {
    const changes = [];
    const threshold = 0.1; // 10% change threshold

    Object.keys(current).forEach(metric => {
      if (previous[metric]) {
        const change = Math.abs(current[metric] - previous[metric]) / previous[metric];

        if (change > threshold) {
          changes.push({
            type: 'metric',
            metric,
            description: `${metric} changed from ${previous[metric]} to ${current[metric]} (${(change * 100).toFixed(1)}% change)`,
            severity: change > 0.5 ? 'high' : 'medium',
            change: change
          });
        }
      }
    });

    return changes;
  }

  /**
   * Calculate metrics for the current content
   * @param {Object} current - Current content
   * @param {Object} previous - Previous content
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(current, previous) {
    return {
      currentMetrics: current.metrics,
      previousMetrics: previous?.metrics || {},
      changeRate: previous ? this.calculateChangeRate(current, previous) : 0
    };
  }

  /**
   * Calculate overall change rate
   * @param {Object} current - Current content
   * @param {Object} previous - Previous content
   * @returns {number} Change rate percentage
   */
  calculateChangeRate(current, previous) {
    // Simple change rate calculation based on content similarity
    const currentWords = current.textContent.split(/\s+/);
    const previousWords = previous.textContent.split(/\s+/);

    const commonWords = currentWords.filter(word => previousWords.includes(word));
    const changeRate = 1 - (commonWords.length / Math.max(currentWords.length, previousWords.length));

    return changeRate;
  }

  /**
   * Monitor multiple competitors
   * @param {Array} competitors - List of competitors
   * @returns {Array} Monitoring results for all competitors
   */
  async monitorAll(competitors) {
    logger.info(`Starting website monitoring for ${competitors.length} competitors`);

    const results = [];

    for (const competitor of competitors) {
      if (competitor.monitoring?.website) {
        const result = await this.monitorWebsite(competitor);
        results.push(result);

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await this.closeBrowser();

    logger.info(`Website monitoring completed for ${results.length} competitors`);
    return results;
  }
}

module.exports = WebsiteMonitor; 