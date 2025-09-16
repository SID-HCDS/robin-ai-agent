const express = require('express');
const router = express.Router();
const axios = require('axios');
const Chat = require('../models/chat');

const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://YOUR-RESOURCE.openai.azure.com
const openaiApiKey = process.env.AZURE_OPENAI_API_KEY;
const openaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
const searchIndexName = process.env.AZURE_AI_SEARCH_INDEX;

router.post('/', async (req, res) => {
  const { message, lang, email } = req.body;

  try {
    const systemPrompt =
      "You are an insurance agent. You must answer ONLY using the provided documents. " +
      "If the answer is not present, reply: 'Sorry, I couldn't find an answer in our documents.' " +
      "Do NOT use your own knowledge. Do NOT make up answers.";

    const payload = {
      model: openaiDeployment,
      temperature: 0.5,
      max_tokens: 1000,
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
            indexName: searchIndexName
          }
        }
      ]
    };

    const endpoint = `${openaiEndpoint}/openai/deployments/${openaiDeployment}/chat/completions?api-version=2023-09-01-preview`;

    const openaiResponse = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          'api-key': openaiApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = openaiResponse.data.choices[0]?.message?.content || 'No reply from AI';

    if (
      reply.trim() === "" ||
      reply.toLowerCase().includes("as an insurance agent") ||
      reply.toLowerCase().includes("i don't have that information") ||
      reply.toLowerCase().includes("insurance is") ||
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

module.exports = router;
