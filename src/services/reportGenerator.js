const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const moment = require('moment');
const logger = require('../utils/logger');
const { config } = require('../config');

class ReportGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.reportsDir = config.paths.reports;
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories', error);
    }
  }

  /**
   * Generate a comprehensive weekly report
   * @param {Object} data - Monitoring data from all services
   * @returns {Object} Generated report information
   */
  async generateWeeklyReport(data) {
    const startTime = Date.now();
    logger.info('Starting weekly report generation');

    try {
      const reportId = this.generateReportId();
      const reportDate = new Date();

      // Process and analyze data
      const processedData = this.processData(data);
      const insights = this.generateInsights(processedData);
      const recommendations = this.generateRecommendations(insights);

      const reportData = {
        reportId,
        generatedAt: reportDate.toISOString(),
        period: this.getReportPeriod(),
        summary: this.generateSummary(processedData),
        insights,
        recommendations,
        detailedData: processedData,
        metadata: {
          competitors: processedData.competitors.length,
          totalChanges: this.countTotalChanges(processedData),
          totalEngagement: this.calculateTotalEngagement(processedData)
        }
      };

      // Generate different report formats
      const reports = {};

      if (config.reports.format === 'html' || config.reports.format === 'all') {
        reports.html = await this.generateHTMLReport(reportData);
      }

      if (config.reports.format === 'json' || config.reports.format === 'all') {
        reports.json = await this.generateJSONReport(reportData);
      }

      // Save report files
      const savedFiles = await this.saveReports(reportId, reports);

      const duration = Date.now() - startTime;
      logger.info(`Weekly report generated in ${duration}ms`, {
        reportId,
        files: Object.keys(savedFiles)
      });

      return {
        reportId,
        generatedAt: reportDate.toISOString(),
        files: savedFiles,
        summary: reportData.summary,
        insights: insights.length,
        recommendations: recommendations.length
      };

    } catch (error) {
      logger.error('Failed to generate weekly report', error);
      throw error;
    }
  }

  /**
   * Process raw monitoring data into structured format
   * @param {Object} data - Raw monitoring data
   * @returns {Object} Processed data
   */
  processData(data) {
    const processed = {
      competitors: [],
      websiteChanges: [],
      priceChanges: [],
      seoMetrics: [],
      summary: {}
    };

    // Process website monitoring data
    if (data.websiteMonitoring) {
      data.websiteMonitoring.forEach(result => {
        processed.competitors.push({
          name: result.competitor,
          website: result.website,
          changes: result.changes.length,
          errors: result.errors.length
        });

        if (result.changes.length > 0) {
          processed.websiteChanges.push({
            competitor: result.competitor,
            changes: result.changes,
            metrics: result.metrics
          });
        }
      });
    }



    // Process price monitoring data (if available)
    if (data.priceMonitoring) {
      processed.priceChanges = data.priceMonitoring;
    }

    // Process SEO data (if available)
    if (data.seoMonitoring) {
      processed.seoMetrics = data.seoMonitoring;
    }

    // Generate summary statistics
    processed.summary = this.generateSummaryStats(processed);

    return processed;
  }

  /**
   * Generate insights from processed data
   * @param {Object} processedData - Processed monitoring data
   * @returns {Array} List of insights
   */
  generateInsights(processedData) {
    const insights = [];

    // Website changes insights
    if (processedData.websiteChanges.length > 0) {
      const totalChanges = processedData.websiteChanges.reduce((sum, item) => sum + item.changes.length, 0);
      insights.push({
        type: 'website',
        title: 'Website Activity Detected',
        description: `${totalChanges} website changes detected across ${processedData.websiteChanges.length} competitors`,
        severity: totalChanges > 5 ? 'high' : 'medium',
        competitors: processedData.websiteChanges.map(item => item.competitor)
      });
    }



    // Competitive analysis insights
    const topCompetitors = this.identifyTopCompetitors(processedData);
    if (topCompetitors.length > 0) {
      insights.push({
        type: 'competitive',
        title: 'Top Performing Competitors',
        description: `${topCompetitors[0].name} shows the highest activity level`,
        severity: 'medium',
        competitors: topCompetitors.slice(0, 3)
      });
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   * @param {Array} insights - Generated insights
   * @returns {Array} List of recommendations
   */
  generateRecommendations(insights) {
    const recommendations = [];

    insights.forEach(insight => {
      switch (insight.type) {
        case 'website':
          recommendations.push({
            title: 'Monitor Website Changes Closely',
            description: 'Competitors are actively updating their websites. Consider reviewing your own website strategy.',
            priority: insight.severity === 'high' ? 'high' : 'medium',
            action: 'Review website content and consider updates'
          });
          break;



        case 'competitive':
          recommendations.push({
            title: 'Analyze Top Competitor Strategies',
            description: `Study ${insight.competitors[0].name}'s approach to identify opportunities.`,
            priority: 'high',
            action: 'Conduct detailed competitor analysis'
          });
          break;
      }
    });

    // Add general recommendations
    recommendations.push({
      title: 'Regular Monitoring Schedule',
      description: 'Continue weekly monitoring to track trends and identify patterns.',
      priority: 'medium',
      action: 'Maintain current monitoring schedule'
    });

    return recommendations;
  }

  /**
   * Generate summary statistics
   * @param {Object} processedData - Processed data
   * @returns {Object} Summary statistics
   */
  generateSummaryStats(processedData) {
    const totalCompetitors = processedData.competitors.length;
    const totalWebsiteChanges = processedData.websiteChanges.reduce((sum, item) => sum + item.changes.length, 0);

    return {
      totalCompetitors,
      totalWebsiteChanges,
      activeCompetitors: processedData.competitors.filter(c => c.changes > 0).length
    };
  }

  /**
   * Identify top performing competitors
   * @param {Object} processedData - Processed data
   * @returns {Array} Top competitors
   */
  identifyTopCompetitors(processedData) {
    const competitors = processedData.competitors.map(comp => {
      return {
        name: comp.name,
        websiteChanges: comp.changes,
        totalActivity: comp.changes
      };
    });

    return competitors.sort((a, b) => b.totalActivity - a.totalActivity);
  }

  /**
   * Generate HTML report
   * @param {Object} reportData - Report data
   * @returns {string} HTML content
   */
  async generateHTMLReport(reportData) {
    const template = await this.loadHTMLTemplate();
    const html = template(reportData);
    return html;
  }

  /**
   * Generate JSON report
   * @param {Object} reportData - Report data
   * @returns {string} JSON content
   */
  async generateJSONReport(reportData) {
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Load HTML template
   * @returns {Function} Handlebars template function
   */
  async loadHTMLTemplate() {
    try {
      const templatePath = path.join(this.templatesDir, 'weekly-report.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return Handlebars.compile(templateContent);
    } catch (error) {
      // If template doesn't exist, create a default one
      logger.warn('HTML template not found, creating default template');
      await this.createDefaultTemplate();
      const templateContent = await fs.readFile(path.join(this.templatesDir, 'weekly-report.hbs'), 'utf8');
      return Handlebars.compile(templateContent);
    }
  }

  /**
   * Create default HTML template
   */
  async createDefaultTemplate() {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Competitors Analysis Report - {{period}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #007bff; margin: 0; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .summary-item { text-align: center; padding: 15px; background: white; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .summary-item h3 { margin: 0; color: #007bff; }
        .summary-item p { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .insight { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2196f3; }
        .insight.high { background: #ffebee; border-left-color: #f44336; }
        .insight.medium { background: #fff3e0; border-left-color: #ff9800; }
        .recommendation { background: #f1f8e9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4caf50; }
        .competitor-list { list-style: none; padding: 0; }
        .competitor-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Competitors Analysis Report</h1>
            <p>Generated on {{formatDate generatedAt}} | Period: {{period}}</p>
        </div>

        <div class="summary">
            <h2>Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <h3>Competitors Monitored</h3>
                    <p>{{metadata.competitors}}</p>
                </div>
                <div class="summary-item">
                    <h3>Website Changes</h3>
                    <p>{{metadata.totalChanges}}</p>
                </div>
                <div class="summary-item">
                    <h3>Active Competitors</h3>
                    <p>{{summary.activeCompetitors}}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Key Insights</h2>
            {{#each insights}}
            <div class="insight {{severity}}">
                <h3>{{title}}</h3>
                <p>{{description}}</p>
                {{#if competitors}}
                <p><strong>Competitors:</strong> {{#each competitors}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}</p>
                {{/if}}
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>Recommendations</h2>
            {{#each recommendations}}
            <div class="recommendation">
                <h3>{{title}}</h3>
                <p>{{description}}</p>
                <p><strong>Action:</strong> {{action}}</p>
                <p><strong>Priority:</strong> <span style="color: {{#if (eq priority 'high')}}#f44336{{else if (eq priority 'medium')}}#ff9800{{else}}#4caf50{{/if}}">{{priority}}</span></p>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>Detailed Analysis</h2>
            <h3>Competitors Overview</h3>
            <ul class="competitor-list">
                {{#each detailedData.competitors}}
                <li class="competitor-item">
                    <strong>{{name}}</strong> - Website changes: {{changes}}, Errors: {{errors}}
                </li>
                {{/each}}
            </ul>
        </div>

        <div class="metadata">
            <p><strong>Report ID:</strong> {{reportId}}</p>
            <p><strong>Generated:</strong> {{formatDate generatedAt}}</p>
            <p><strong>Analysis Period:</strong> {{period}}</p>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(this.templatesDir, 'weekly-report.hbs'), template);
  }

  /**
   * Save generated reports to files
   * @param {string} reportId - Report ID
   * @param {Object} reports - Generated reports
   * @returns {Object} Saved file paths
   */
  async saveReports(reportId, reports) {
    const savedFiles = {};

    for (const [format, content] of Object.entries(reports)) {
      const filename = `competitors-report-${reportId}.${format}`;
      const filepath = path.join(this.reportsDir, filename);

      await fs.writeFile(filepath, content);
      savedFiles[format] = filepath;
    }

    return savedFiles;
  }

  /**
   * Generate unique report ID
   * @returns {string} Report ID
   */
  generateReportId() {
    const date = new Date();
    return `weekly-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get report period string
   * @returns {string} Report period
   */
  getReportPeriod() {
    const now = moment();
    const weekStart = now.clone().startOf('week');
    const weekEnd = now.clone().endOf('week');

    return `${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD, YYYY')}`;
  }

  /**
   * Count total changes across all monitoring data
   * @param {Object} processedData - Processed data
   * @returns {number} Total changes
   */
  countTotalChanges(processedData) {
    let total = 0;

    if (processedData.websiteChanges) {
      total += processedData.websiteChanges.reduce((sum, item) => sum + item.changes.length, 0);
    }

    return total;
  }

  /**
   * Calculate total engagement across all social media
   * @param {Object} processedData - Processed data
   * @returns {number} Total engagement
   */
  calculateTotalEngagement(processedData) {
    return 0;
  }

  /**
   * Generate summary for the report
   * @param {Object} processedData - Processed data
   * @returns {Object} Summary
   */
  generateSummary(processedData) {
    return {
      totalCompetitors: processedData.competitors.length,
      websiteChanges: this.countTotalChanges(processedData),
      totalEngagement: this.calculateTotalEngagement(processedData)
    };
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function (dateString) {
  return moment(dateString).format('MMMM DD, YYYY HH:mm');
});

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

module.exports = ReportGenerator; 