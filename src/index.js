const express = require('express');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;

// Import configuration and utilities
const { config, validateConfig, ensureDirectories } = require('./config');
const logger = require('./utils/logger');

// Import services
const WebsiteMonitor = require('./services/websiteMonitor');
const ReportGenerator = require('./services/reportGenerator');

// Import data loader
const CompetitorsLoader = require('./utils/competitorsLoader');

class CompetitorsAnalysisAgent {
  constructor() {
    this.app = express();
    this.websiteMonitor = new WebsiteMonitor();
    this.reportGenerator = new ReportGenerator();
    this.competitorsLoader = new CompetitorsLoader();

    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;

    this.setupExpress();
    this.setupScheduler();
  }

  /**
   * Setup Express application
   */
  setupExpress() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.api(req.path, req.method, res.statusCode, duration);
      });
      next();
    });

    // Routes
    this.setupRoutes();

    // Error handling
    this.app.use((error, req, res, next) => {
      logger.error('Express error', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      });
    });

    // System status
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        isRunning: this.isRunning,
        lastRun: this.lastRun,
        nextRun: this.nextRun,
        competitors: this.competitorsLoader.getCompetitorsCount(),
        config: {
          schedule: config.schedule.analysis,
          timezone: config.schedule.timezone,
          emailEnabled: config.reports.emailEnabled
        }
      });
    });

    // Manual analysis trigger
    this.app.post('/analyze', async (req, res) => {
      try {
        if (this.isRunning) {
          return res.status(409).json({ error: 'Analysis already running' });
        }

        logger.info('Manual analysis triggered via API');
        const result = await this.runAnalysis();
        res.json(result);
      } catch (error) {
        logger.error('Manual analysis failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    // List reports
    this.app.get('/reports', async (req, res) => {
      try {
        const reports = await this.listReports();
        res.json(reports);
      } catch (error) {
        logger.error('Failed to list reports', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Download specific report
    this.app.get('/reports/:id', async (req, res) => {
      try {
        const reportPath = await this.getReportPath(req.params.id);
        if (!reportPath) {
          return res.status(404).json({ error: 'Report not found' });
        }

        res.download(reportPath);
      } catch (error) {
        logger.error('Failed to download report', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Competitors management
    this.app.get('/competitors', (req, res) => {
      try {
        const competitors = this.competitorsLoader.getCompetitors();
        res.json(competitors);
      } catch (error) {
        logger.error('Failed to get competitors', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Dashboard
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/dashboard.html'));
    });
  }

  /**
   * Setup scheduled analysis
   */
  setupScheduler() {
    // Schedule weekly analysis (every Wednesday at 9 AM)
    cron.schedule(config.schedule.analysis, async () => {
      logger.info('Scheduled analysis triggered');
      await this.runAnalysis();
    }, {
      timezone: config.schedule.timezone
    });

    // Calculate next run time
    this.calculateNextRun();

    logger.info(`Scheduler configured for: ${config.schedule.analysis} (${config.schedule.timezone})`);
  }

  /**
   * Calculate next scheduled run
   */
  calculateNextRun() {
    const cronParser = require('cron-parser');
    const interval = cronParser.parseExpression(config.schedule.analysis, {
      tz: config.schedule.timezone
    });
    this.nextRun = interval.next().toDate();
  }

  /**
   * Run the complete analysis
   */
  async runAnalysis() {
    if (this.isRunning) {
      throw new Error('Analysis already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting competitors analysis');

      // Load competitors
      const competitors = this.competitorsLoader.getCompetitors();
      if (competitors.length === 0) {
        throw new Error('No competitors configured');
      }

      logger.info(`Loaded ${competitors.length} competitors for analysis`);

      // Run monitoring services
      const results = {
        websiteMonitoring: [],
        priceMonitoring: [],
        seoMonitoring: []
      };

      // Website monitoring
      logger.info('Starting website monitoring');
      results.websiteMonitoring = await this.websiteMonitor.monitorAll(competitors);

      // Generate report
      logger.info('Generating weekly report');
      const reportResult = await this.reportGenerator.generateWeeklyReport(results);

      // Send email report if enabled
      if (config.reports.emailEnabled) {
        await this.sendEmailReport(reportResult);
      }

      this.lastRun = new Date().toISOString();
      const duration = Date.now() - startTime;

      logger.info(`Analysis completed successfully in ${duration}ms`, {
        competitors: competitors.length,
        websiteChanges: results.websiteMonitoring.reduce((sum, r) => sum + r.changes.length, 0),
        reportId: reportResult.reportId
      });

      return {
        success: true,
        duration,
        reportId: reportResult.reportId,
        summary: reportResult.summary,
        insights: reportResult.insights,
        recommendations: reportResult.recommendations
      };

    } catch (error) {
      logger.error('Analysis failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send email report
   */
  async sendEmailReport(reportResult) {
    try {
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: false,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        }
      });

      const htmlReportPath = reportResult.files.html;
      const htmlContent = await fs.readFile(htmlReportPath, 'utf8');

      const mailOptions = {
        from: config.email.from,
        to: config.email.to,
        subject: `Competitors Analysis Report - ${reportResult.reportId}`,
        html: htmlContent,
        attachments: [
          {
            filename: `competitors-report-${reportResult.reportId}.html`,
            path: htmlReportPath
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      logger.info('Email report sent successfully');

    } catch (error) {
      logger.error('Failed to send email report', error);
    }
  }

  /**
   * List available reports
   */
  async listReports() {
    try {
      const files = await fs.readdir(config.paths.reports);
      const reports = [];

      for (const file of files) {
        if (file.startsWith('competitors-report-') && file.endsWith('.html')) {
          const filePath = path.join(config.paths.reports, file);
          const stats = await fs.stat(filePath);

          reports.push({
            id: file.replace('competitors-report-', '').replace('.html', ''),
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }

      return reports.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    } catch (error) {
      logger.error('Failed to list reports', error);
      throw error;
    }
  }

  /**
   * Get report file path
   */
  async getReportPath(reportId) {
    try {
      const htmlPath = path.join(config.paths.reports, `competitors-report-${reportId}.html`);
      await fs.access(htmlPath);
      return htmlPath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start the application
   */
  async start() {
    try {
      // Validate configuration
      if (!validateConfig()) {
        logger.warn('Configuration validation failed - some features may not work');
      }

      // Ensure directories exist
      ensureDirectories();

      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`Competitors Analysis Agent started on port ${config.port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info(`Schedule: ${config.schedule.analysis} (${config.schedule.timezone})`);
        logger.info(`Next run: ${this.nextRun}`);
        logger.info(`Health check: http://localhost:${config.port}/health`);
        logger.info(`Dashboard: http://localhost:${config.port}/dashboard`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

    } catch (error) {
      logger.error('Failed to start application', error);
      process.exit(1);
    }
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const agent = new CompetitorsAnalysisAgent();
  agent.start();
}

module.exports = CompetitorsAnalysisAgent; 