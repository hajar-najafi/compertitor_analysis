# 📧 Email Configuration Guide

## Quick Setup (Gmail)

### Step 1: Enable Gmail App Passwords
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled
4. Go to "App passwords" (under 2-Step Verification)
5. Select "Mail" and "Other (Custom name)"
6. Name it "Competitors Analysis Agent"
7. Click "Generate"
8. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 2: Edit .env File
Replace these lines in your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_actual_gmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=your_actual_gmail@gmail.com
EMAIL_TO=your_actual_gmail@gmail.com
```

### Step 3: Test Configuration
1. Save the .env file
2. Restart the application: `npm run dev`
3. Go to the dashboard: http://localhost:3000/dashboard
4. Click "Run Analysis Now"
5. Check your email for the report

---

## Advanced Setup (Other Providers)

### Office 365 / Microsoft 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@yourcompany.com
SMTP_PASS=your_password
EMAIL_FROM=your_email@yourcompany.com
EMAIL_TO=your_email@yourcompany.com
```

### Outlook.com
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
EMAIL_FROM=your_email@outlook.com
EMAIL_TO=your_email@outlook.com
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@yahoo.com
EMAIL_TO=your_email@yahoo.com
```

### Custom SMTP Server
```env
SMTP_HOST=your_smtp_server.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
EMAIL_FROM=your_email@yourdomain.com
EMAIL_TO=recipient@domain.com
```

---

## Email Service Providers

### SendGrid
1. Create account at [SendGrid](https://sendgrid.com/)
2. Get API key from dashboard
3. Configure:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=your_verified_sender@yourdomain.com
EMAIL_TO=recipient@domain.com
```

### Mailgun
1. Create account at [Mailgun](https://mailgun.com/)
2. Get SMTP credentials from dashboard
3. Configure:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_mailgun_username
SMTP_PASS=your_mailgun_password
EMAIL_FROM=your_verified_sender@yourdomain.com
EMAIL_TO=recipient@domain.com
```

---

## Configuration Options

### Multiple Recipients
To send to multiple email addresses, separate them with commas:
```env
EMAIL_TO=reports@company.com,manager@company.com,ceo@company.com
```

### Different From/To Addresses
```env
EMAIL_FROM=competitors@yourcompany.com
EMAIL_TO=your_email@yourcompany.com
```

### Disable Email Reports
If you don't want email reports:
```env
ENABLE_EMAIL_REPORTS=false
```

---

## Troubleshooting

### Common Issues

#### 1. "Authentication failed" error
- **Solution**: Check your app password is correct
- **For Gmail**: Make sure you're using app password, not regular password

#### 2. "Connection timeout" error
- **Solution**: Check your SMTP_HOST and SMTP_PORT
- **Common ports**: 587 (TLS), 465 (SSL), 25 (unencrypted)

#### 3. "Sender not verified" error
- **Solution**: Verify your sender email address with your provider
- **For Gmail**: Use the same email for FROM and USER

#### 4. "Rate limit exceeded" error
- **Solution**: Gmail free accounts have 500 emails/day limit
- **Upgrade**: Consider paid email service for higher limits

### Testing Your Configuration

1. **Test SMTP Connection**:
```bash
curl -X POST http://localhost:3000/analyze
```

2. **Check Logs**:
```bash
tail -f logs/combined.log
```

3. **Manual Test**:
- Run analysis from dashboard
- Check email inbox
- Look for error messages in logs

---

## Security Best Practices

1. **Never commit .env file to git**
2. **Use app passwords, not regular passwords**
3. **Use environment variables in production**
4. **Regularly rotate app passwords**
5. **Monitor email sending limits**

---

## Production Deployment

For production, consider:
- Using environment variables instead of .env file
- Setting up email service with higher limits
- Implementing email templates
- Adding email analytics and tracking
- Setting up email backup/fallback options 