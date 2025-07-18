require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twilio = require('twilio');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Log startup info
console.log("🚀 Trade2Retire Automation Starting...");
console.log("Twilio SID:", process.env.TWILIO_SID ? "****" + process.env.TWILIO_SID.slice(-4) : "MISSING");
console.log("Twilio Number:", process.env.TWILIO_NUMBER);
console.log("Group Link:", process.env.WHATSAPP_GROUP_LINK);
console.log("Sandbox Code:", process.env.SANDBOX_CODE);

// Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_SID, 
  process.env.TWILIO_TOKEN
);

// User state tracking
const userStates = {};

// Send message helper
const sendMessage = async (to, body) => {
  try {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    await twilioClient.messages.create({
      body: body,
      from: `whatsapp:${process.env.TWILIO_NUMBER}`,
      to: formattedTo
    });
    
    console.log(`✅ Message sent to ${formattedTo}`);
    return true;
  } catch (error) {
    console.error('🚨 Message failed:', error.message);
    return false;
  }
};

// Process new users
const handleNewUser = async (from) => {
  // Store user state
  userStates[from] = 'awaiting_activation';
  
  // Send activation instructions
  await sendMessage(
    from,
    `📲 *Trade2Retire Activation Required*\n\n` +
    `To continue, please activate our WhatsApp service:\n` +
    `1. Reply with this code: ${process.env.SANDBOX_CODE}\n` +
    `2. Then resend your payment screenshot\n\n` +
    `_This is required for security verification_`
  );
  
  // Notify admin
  await sendMessage(
    process.env.BUSINESS_PHONE,
    `🆕 New student activation required:\n` +
    `From: ${from}\n` +
    `Please guide them to send: ${process.env.SANDBOX_CODE}`
  );
};

// Process payment screenshot
const processPayment = async (from) => {
  // Send group invite
  await sendMessage(
    from,
    `🎉 *Payment Verified!*\n\n` +
    `Welcome to Trade2Retire! Join our group:\n` +
    `${process.env.WHATSAPP_GROUP_LINK}\n\n` +
    `See you inside! 👋`
  );
  
  // Update user state
  userStates[from] = 'active';
  
  console.log(`💰 Payment processed for ${from}`);
};

// WhatsApp webhook handler
app.post('/webhook', async (req, res) => {
  try {
    const from = req.body.From;
    const body = (req.body.Body || '').trim().toLowerCase();
    const mediaCount = parseInt(req.body.NumMedia) || 0;
    
    console.log(`📩 Incoming from ${from}: ${body.substring(0, 50)}`);

    // New user activation flow
    if (body === process.env.SANDBOX_CODE.toLowerCase()) {
      userStates[from] = 'activated';
      await sendMessage(
        from,
        `✅ *Activation Successful!*\n\n` +
        `You can now send payment screenshots\n` +
        `to join Trade2Retire group immediately.`
      );
      return res.status(200).send('OK');
    }
    
    // Handle payment screenshot
    if (mediaCount > 0) {
      // Check user status
      if (!userStates[from] || userStates[from] === 'awaiting_activation') {
        await handleNewUser(from);
      } else if (userStates[from] === 'activated' || userStates[from] === 'active') {
        await processPayment(from);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('🚨 Webhook error:', error);
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
    <p>Sandbox Code: ${process.env.SANDBOX_CODE}</p>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
