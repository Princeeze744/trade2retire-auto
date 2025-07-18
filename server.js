require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twilio = require('twilio');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_SID, 
  process.env.TWILIO_TOKEN
);

// Automatic response function
const autoRespond = async (fromPhone) => {
  try {
    // Format phone number
    const formattedPhone = fromPhone.startsWith('whatsapp:') 
      ? fromPhone 
      : `whatsapp:${fromPhone}`;
    
    // Send group invite
    await twilioClient.messages.create({
      body: `🎉 Payment verified!\n` +
            `Join Trade2Retire group:\n` +
            process.env.WHATSAPP_GROUP_LINK,
      from: `whatsapp:${process.env.TWILIO_NUMBER}`,
      to: formattedPhone
    });
    
    console.log(`✅ Group invite sent to ${formattedPhone}`);
  } catch (error) {
    console.error('Response error:', error);
  }
};

// WhatsApp webhook
app.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;
  const mediaCount = parseInt(req.body.NumMedia);
  
  console.log(`📩 Incoming message from ${from}: ${body}`);
  
  try {
    // Check if message contains media
    if (mediaCount > 0) {
      console.log(`🖼️ Payment screenshot detected from ${from}`);
      await autoRespond(from);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Trade2Retire Automation Server is Running!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
