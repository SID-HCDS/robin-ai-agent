console.log("DEBUG: chat.js loaded at", new Date().toISOString());

const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

const containerName = 'robincontainer';
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_BLOB_CONNECTION_STRING);

async function getAllFilesText() {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  let allText = '';
  for await (const blob of containerClient.listBlobsFlat()) {
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    const downloadBlockBlobResponse = await blockBlobClient.downloadToBuffer();
    allText += downloadBlockBlobResponse.toString() + '\n';
  }
  return allText;
}

function hasRelevantInfo(message, allText) {
  const cleanedMessage = message.toLowerCase().replace(/[^\w\s]/gi, '');
  console.log("DEBUG: cleanedMessage:", cleanedMessage);

  // Split message into keywords (all words longer than 2 chars)
  const messageKeywords = cleanedMessage.split(/\s+/).filter(word => word.length > 2);

  // Log all keywords
  console.log("DEBUG: All keywords being checked:", messageKeywords);

  // Check if ANY keyword is present in the allText
  let matchedKeywords = [];
  for (const word of messageKeywords) {
    if (allText.toLowerCase().includes(word)) {
      matchedKeywords.push(word);
    }
  }
  console.log("DEBUG: Matched keywords:", matchedKeywords);

  if (matchedKeywords.length >= 1) {
    console.log("MATCH: At least 1 keyword found for message:", message);
    return true;
  }
  return false;
}

router.post('/', async (req, res) => {
  console.log("DEBUG: chat.js POST handler reached");
  const { message, lang, email } = req.body;

  console.log('Received chat request:', { message, lang, email });

  try {
    const allText = await getAllFilesText();
    console.log("DEBUG: allText length:", allText.length);
    console.log("DEBUG: Preview of allText:", allText.slice(0, 500)); // Preview for debugging

    const allowed = hasRelevantInfo(message, allText);
    if (!allowed) {
      console.log('BLOCKED: No relevant info found in blob storage for message:', message);
      const reply = "Sorry, I couldn't find an answer in our documents.";
      const chat = new Chat({ message, reply, lang, email });
      await chat.save();
      return res.json({ reply });
    }
    console.log('ALLOWED: Relevant info found, sending to OpenAI for message:', message);

    const systemPrompt =
      "You are an insurance agent. You must answer ONLY using the provided documents. " +
      "If the answer is not present, reply: 'Sorry, I couldn't find an answer in our documents.' " +
      "Do NOT use your own knowledge. Do NOT make up answers.";
    const userPrompt =
      `Documents:\n${allText}\n\nQuestion: ${message}`;

    const openaiResponse = await axios.post(
      process.env.AZURE_OPENAI_ENDPOINT,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      },
      {
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = openaiResponse.data.choices[0]?.message?.content || 'No reply from AI';

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
    res.status(500).json({ error: 'Failed to get response from OpenAI or Blob Storage.' });
  }
});

router.get('/history', async (req, res) => {
  const { email } = req.query;
  const filter = email ? { email } : {};
  const history = await Chat.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
