const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const axios = require('axios');

// Send message to chat (connect to Azure OpenAI)
router.post('/', async (req, res) => {
  const { message, lang, email } = req.body;  // Optionally add user email

  // LOG incoming request
  console.log('Received OpenAI chat request:', { message, lang, email });

  try {
    // Example payload for Azure OpenAI (update to your deployment/model)
    const openaiResponse = await axios.post(
      process.env.OPENAI_ENDPOINT, // e.g. https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15
      {
        messages: [
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          'api-key': process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // LOG OpenAI response
    console.log('OpenAI API response:', openaiResponse.data);

    // Extract reply (adjust as per your OpenAI response structure)
    const reply = openaiResponse.data.choices[0]?.message?.content || 'No reply from AI';

    // Save to chat history
    const chat = new Chat({ message, reply, lang });
    await chat.save();

    res.json({ reply });

  } catch (err) {
    // LOG error
    console.error('OpenAI API error:', err?.response?.data || err.message);

    res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
});

// Get chat history for a user
router.get('/history', async (req, res) => {
  // TODO: filter by user if email provided
  const history = await Chat.find().sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
