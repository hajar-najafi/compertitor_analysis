# Competitors Analysis Agent

An automated system that monitors competitors' activities weekly and generates comprehensive reports with actionable insights.

## 🎯 Project Overview

This agent runs every Wednesday to:
- Monitor competitor website changes
- Track social media publications and engagement
- Monitor price changes on e-commerce sites
- Analyze SEO metrics and keyword rankings
- Generate weekly reports with insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- NPM or Yarn
- Access to various APIs (see Configuration section)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd competitors-analysis-agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. **Run the setup script**
```bash
npm run setup
```

5. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
competitors-analysis-agent/
├── src/
│   ├── index.js                 # Main application entry point
│   ├── config/                  # Configuration files
│   ├── services/                # Core services
│   │   ├── websiteMonitor.js    # Website change monitoring
│   │   ├── socialMediaMonitor.js # Social media tracking
│   │   ├── priceMonitor.js      # Price tracking
│   │   ├── seoMonitor.js        # SEO metrics monitoring
│   │   └── reportGenerator.js   # Report generation
│   ├── models/                  # Data models
│   ├── utils/                   # Utility functions
│   └── templates/               # Report templates
├── data/                        # Data storage
├── logs/                        # Application logs
├── scripts/                     # Setup and utility scripts
└── tests/                       # Test files
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=your_database_url

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# API Keys
SOCIAL_MEDIA_API_KEY=your_social_media_api_key
SEO_API_KEY=your_seo_api_key
PRICE_MONITORING_API_KEY=your_price_api_key

# Competitors Configuration
COMPETITORS_FILE=./data/competitors.json
REPORTS_DIR=./data/reports
```

### Competitors Configuration

Create `data/competitors.json` with your competitors:

```json
{
  "competitors": [
    {
      "name": "Competitor A",
      "website": "https://competitor-a.com",
      "socialMedia": {
        "facebook": "competitor-a",
        "instagram": "competitor_a",
        "linkedin": "company/competitor-a"
      },
      "ecommerce": {
        "url": "https://shop.competitor-a.com",
        "products": ["product1", "product2"]
      }
    }
  ]
}
```

## 🔧 Features

### Phase 1: MVP (Current)
- ✅ Basic website monitoring
- ✅ Social media tracking
- ✅ Automated scheduling (every Wednesday)
- ✅ Email report delivery

### Phase 2: Core Features (Next)
- 🔄 Price tracking
- 🔄 SEO monitoring
- 🔄 Trend analysis

### Phase 3: Advanced Features
- 📊 Dashboard interface
- 📊 Alert system
- 📊 Advanced analytics

## 📊 Usage

### Manual Execution
```bash
# Run analysis immediately
npm run analyze

# Generate report for specific date
npm run report -- --date=2024-01-15
```

### Automated Execution
The agent runs automatically every Wednesday at 9:00 AM. You can modify the schedule in `src/config/scheduler.js`.

## 📈 Monitoring

### Logs
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Analysis logs: `logs/analysis.log`

### Health Check
```bash
curl http://localhost:3000/health
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/websiteMonitor.test.js
```

## 📝 API Documentation

### Endpoints

- `GET /health` - Health check
- `GET /status` - System status
- `POST /analyze` - Trigger manual analysis
- `GET /reports` - List generated reports
- `GET /reports/:id` - Download specific report

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: support@webagencytorino.com

---

**Built with ❤️ by Web Agency Torino** 