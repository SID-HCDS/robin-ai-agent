console.log("DEBUG: chat.js loaded at", new Date().toISOString());

const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const axios = require('axios');

// Secrets from your environment variables
const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/extensions/chat/completions?api-version=2023-06-01-preview
const openaiApiKey = process.env.AZURE_OPENAI_API_KEY;
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT; // e.g. https://robinsearch.search.windows.net
const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
const searchIndexName = "azureblob-index";

router.post('/', async (req, res) => {
  console.log("DEBUG: chat.js POST handler reached");
  const { message, lang, email } = req.body;

  console.log('Received chat request:', { message, lang, email });

  try {
    // System prompt for insurance agent
    const systemPrompt =
      "You are an insurance agent. You must answer ONLY using the provided documents. " +
      "If the answer is not present, reply: 'Sorry, I couldn't find an answer in our documents.' " +
      "Do NOT use your own knowledge. Do NOT make up answers.";

    // Prepare OpenAI payload WITH Cognitive Search as data source
    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      dataSources: [
        {
          type: "AzureCognitiveSearch",
          parameters: {
            endpoint: searchEndpoint,
            key: searchApiKey,
            indexName: searchIndexName,
            fieldsMapping: {
              contentFields: ["content"], // Main text field
              urlField: "metadata_storage_path" // Use blob path as "url"
              // No titleField, omitted
            }
          }
        }
      ]
    };

    const openaiResponse = await axios.post(
      openaiEndpoint,
      payload,
      {
        headers: {
          'api-key': openaiApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = openaiResponse.data.choices[0]?.message?.content || 'No reply from AI';

    // Optionally, check for generic/unhelpful answers
    if (
      reply.toLowerCase().includes("as an insurance agent") ||
      reply.toLowerCase().includes("i don't have that information") ||
      reply.toLowerCase().includes("insurance is") ||
      reply.trim() === "" ||
      reply.toLowerCase().includes("i am an ai language model")
    ) {
      reply = "Sorry, I couldn't find an answer in our documents.";
    }

    const chat = new Chat({ message, reply, lang, email });
    await chat.save();

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI with Cognitive Search.' });
  }
});

router.get('/history', async (req, res) => {
  const { email } = req.query;
  const filter = email ? { email } : {};
  const history = await Chat.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
