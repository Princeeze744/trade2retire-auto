require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twilio = require('twilio');
const app = express();

// Middleware with increased limits
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Detailed logging
console.log("🚀 Trade2Retire Automation Starting...");
console.log("Twilio SID:", process.env.TWILIO_SID ? "****" + process.env.TWILIO_SID.slice(-4) : "MISSING");
console.log("Twilio Number:", process.env.TWILIO_NUMBER);
console.log("Group Link:", process.env.WHATSAPP_GROUP_LINK);

// Twilio client with error handling
let twilioClient;
try {
  twilioClient = new Twilio(
    process.env.TWILIO_SID, 
    process.env.TWILIO_TOKEN
  );
  console.log("✅ Twilio client initialized");
} catch (error) {
  console.error("❌ Twilio initialization failed:", error.message);
  process.exit(1);
}

// Automatic response function
const autoRespond = async (fromPhone) => {
  try {
    // Format phone number
    let formattedPhone = fromPhone;
    if (!fromPhone.startsWith('whatsapp:')) {
      formattedPhone = `whatsapp:${fromPhone}`;
    }
    
    // Create message
    const message = `🎉 Payment verified!\nJoin Trade2Retire group:\n${process.env.WHATSAPP_GROUP_LINK}`;
    
    // Send message
    await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_NUMBER}`,
      to: formattedPhone
    });
    
    console.log(`✅ Group invite sent to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('🚨 Response error:', error.message);
    console.error('Twilio error code:', error.code);
    return false;
  }
};

// WhatsApp webhook handler
app.post('/webhook', async (req, res) => {
  try {
    console.log("\n=== NEW WEBHOOK REQUEST ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    
    const from = req.body.From;
    const body = req.body.Body || '';
    const mediaCount = parseInt(req.body.NumMedia) || 0;
    
    if (!from) {
      console.log("⚠️ Missing 'From' in request");
      return res.status(400).send("Missing From parameter");
    }
    
    console.log(`📩 Incoming message from ${from}: ${body.substring(0, 50)}...`);
    console.log(`🖼️ Media count: ${mediaCount}`);
    
    // Check if message contains media
    if (mediaCount > 0) {
      console.log(`🖼️ Payment screenshot detected from ${from}`);
      const success = await autoRespond(from);
      
      if (success) {
        console.log("✅ Successfully processed payment screenshot");
      } else {
        console.log("❌ Failed to process payment screenshot");
      }
    } else {
      console.log("ℹ️ No media found - ignoring message");
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('🚨 Webhook processing error:', error);
    res.status(500).send('Server error');
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>Trade2Retire Automation</h1>
    <p>Status: <span style="color:green">RUNNING</span></p>
    <p>Twilio Number: ${process.env.TWILIO_NUMBER}</p>
    <p>Group Link: <a href="${process.env.WHATSAPP_GROUP_LINK}">Join Group</a></p>
    <h3>Last 10 Logs:</h3>
    <pre>${getRecentLogs()}</pre>
  `);
});

// Simple log storage for web display
const logs = [];
const getRecentLogs = () => logs.slice(-10).join('\n');

// Log all requests for debugging
app.use((req, res, next) => {
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}`;
  console.log(logEntry);
  logs.push(logEntry);
  next();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/`);
});
