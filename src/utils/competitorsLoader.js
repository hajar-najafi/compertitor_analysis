const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { config } = require('../config');

class CompetitorsLoader {
  constructor() {
    this.competitors = [];
    this.lastLoaded = null;
    this.filePath = config.paths.competitors;
  }

  /**
   * Load competitors from JSON file
   * @returns {Array} Array of competitors
   */
  async loadCompetitors() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      if (!jsonData.competitors || !Array.isArray(jsonData.competitors)) {
        throw new Error('Invalid competitors data format');
      }

      this.competitors = jsonData.competitors;
      this.lastLoaded = new Date().toISOString();
      
      logger.info(`Loaded ${this.competitors.length} competitors from ${this.filePath}`);
      
      return this.competitors;
    } catch (error) {
      logger.error('Failed to load competitors', error);
      throw error;
    }
  }

  /**
   * Get competitors (load if not already loaded)
   * @returns {Array} Array of competitors
   */
  getCompetitors() {
    if (this.competitors.length === 0) {
      // Load synchronously for immediate use
      try {
        const data = require('fs').readFileSync(this.filePath, 'utf8');
        const jsonData = JSON.parse(data);
        this.competitors = jsonData.competitors || [];
        this.lastLoaded = new Date().toISOString();
      } catch (error) {
        logger.error('Failed to load competitors synchronously', error);
        return [];
      }
    }
    
    return this.competitors;
  }

  /**
   * Get competitors count
   * @returns {number} Number of competitors
   */
  getCompetitorsCount() {
    return this.getCompetitors().length;
  }

  /**
   * Get competitor by ID
   * @param {string} id - Competitor ID
   * @returns {Object|null} Competitor object or null
   */
  getCompetitorById(id) {
    return this.getCompetitors().find(comp => comp.id === id) || null;
  }

  /**
   * Get competitor by name
   * @param {string} name - Competitor name
   * @returns {Object|null} Competitor object or null
   */
  getCompetitorByName(name) {
    return this.getCompetitors().find(comp => comp.name === name) || null;
  }

  /**
   * Get active competitors (with monitoring enabled)
   * @returns {Array} Array of active competitors
   */
  getActiveCompetitors() {
    return this.getCompetitors().filter(comp => comp.monitoring?.enabled !== false);
  }

  /**
   * Get competitors with specific monitoring enabled
   * @param {string} monitoringType - Type of monitoring (website, socialMedia, pricing, seo)
   * @returns {Array} Array of competitors with specified monitoring enabled
   */
  getCompetitorsWithMonitoring(monitoringType) {
    return this.getCompetitors().filter(comp => 
      comp.monitoring?.enabled !== false && comp.monitoring?.[monitoringType] !== false
    );
  }

  /**
   * Add a new competitor
   * @param {Object} competitor - Competitor object
   * @returns {boolean} Success status
   */
  async addCompetitor(competitor) {
    try {
      // Validate competitor data
      if (!competitor.name || !competitor.website) {
        throw new Error('Competitor must have name and website');
      }

      // Generate ID if not provided
      if (!competitor.id) {
        competitor.id = this.generateCompetitorId(competitor.name);
      }

      // Check for duplicates
      if (this.getCompetitorById(competitor.id)) {
        throw new Error(`Competitor with ID ${competitor.id} already exists`);
      }

      // Add default monitoring settings
      competitor.monitoring = {
        enabled: true,
        website: true,
        socialMedia: true,
        pricing: true,
        seo: true,
        ...competitor.monitoring
      };

      // Load current data
      const data = await fs.readFile(this.filePath, 'utf8');
      const jsonData = JSON.parse(data);

      // Add new competitor
      jsonData.competitors.push(competitor);

      // Save updated data
      await fs.writeFile(this.filePath, JSON.stringify(jsonData, null, 2));

      // Update local cache
      this.competitors = jsonData.competitors;
      this.lastLoaded = new Date().toISOString();

      logger.info(`Added competitor: ${competitor.name}`);
      return true;
    } catch (error) {
      logger.error('Failed to add competitor', error);
      throw error;
    }
  }

  /**
   * Update an existing competitor
   * @param {string} id - Competitor ID
   * @param {Object} updates - Updated competitor data
   * @returns {boolean} Success status
   */
  async updateCompetitor(id, updates) {
    try {
      // Load current data
      const data = await fs.readFile(this.filePath, 'utf8');
      const jsonData = JSON.parse(data);

      // Find competitor
      const index = jsonData.competitors.findIndex(comp => comp.id === id);
      if (index === -1) {
        throw new Error(`Competitor with ID ${id} not found`);
      }

      // Update competitor
      jsonData.competitors[index] = { ...jsonData.competitors[index], ...updates };

      // Save updated data
      await fs.writeFile(this.filePath, JSON.stringify(jsonData, null, 2));

      // Update local cache
      this.competitors = jsonData.competitors;
      this.lastLoaded = new Date().toISOString();

      logger.info(`Updated competitor: ${jsonData.competitors[index].name}`);
      return true;
    } catch (error) {
      logger.error('Failed to update competitor', error);
      throw error;
    }
  }

  /**
   * Remove a competitor
   * @param {string} id - Competitor ID
   * @returns {boolean} Success status
   */
  async removeCompetitor(id) {
    try {
      // Load current data
      const data = await fs.readFile(this.filePath, 'utf8');
      const jsonData = JSON.parse(data);

      // Find competitor
      const index = jsonData.competitors.findIndex(comp => comp.id === id);
      if (index === -1) {
        throw new Error(`Competitor with ID ${id} not found`);
      }

      const competitorName = jsonData.competitors[index].name;

      // Remove competitor
      jsonData.competitors.splice(index, 1);

      // Save updated data
      await fs.writeFile(this.filePath, JSON.stringify(jsonData, null, 2));

      // Update local cache
      this.competitors = jsonData.competitors;
      this.lastLoaded = new Date().toISOString();

      logger.info(`Removed competitor: ${competitorName}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove competitor', error);
      throw error;
    }
  }

  /**
   * Generate a unique competitor ID
   * @param {string} name - Competitor name
   * @returns {string} Generated ID
   */
  generateCompetitorId(name) {
    const baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let id = baseId;
    let counter = 1;
    
    while (this.getCompetitorById(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    
    return id;
  }

  /**
   * Validate competitor data
   * @param {Object} competitor - Competitor object
   * @returns {Object} Validation result
   */
  validateCompetitor(competitor) {
    const errors = [];

    if (!competitor.name) {
      errors.push('Name is required');
    }

    if (!competitor.website) {
      errors.push('Website URL is required');
    } else if (!this.isValidUrl(competitor.website)) {
      errors.push('Invalid website URL');
    }

    if (competitor.socialMedia) {
      Object.entries(competitor.socialMedia).forEach(([platform, handle]) => {
        if (handle && typeof handle !== 'string') {
          errors.push(`${platform} handle must be a string`);
        }
      });
    }

    if (competitor.ecommerce?.url && !this.isValidUrl(competitor.ecommerce.url)) {
      errors.push('Invalid e-commerce URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get competitors statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const competitors = this.getCompetitors();
    
    return {
      total: competitors.length,
      active: competitors.filter(c => c.monitoring?.enabled !== false).length,
      withWebsite: competitors.filter(c => c.website).length,
      withSocialMedia: competitors.filter(c => c.socialMedia && Object.keys(c.socialMedia).length > 0).length,
      withEcommerce: competitors.filter(c => c.ecommerce?.url).length,
      lastLoaded: this.lastLoaded
    };
  }

  /**
   * Reload competitors from file
   * @returns {Array} Updated competitors array
   */
  async reload() {
    this.competitors = [];
    this.lastLoaded = null;
    return await this.loadCompetitors();
  }
}

module.exports = CompetitorsLoader; 