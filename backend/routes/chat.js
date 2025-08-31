const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

// Update this with your actual container name!
const containerName = 'robincontainer';

// Setup Blob Service Client using your connection string from environment variables
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_BLOB_CONNECTION_STRING);

// Helper: Get all file contents from Blob Storage
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

router.post('/', async (req, res) => {
  const { message, lang, email } = req.body;

  console.log('Received chat request:', { message, lang, email });

  try {
    // 1. Get all text from Blob Storage
    const allText = await getAllFilesText();

    // 2. Check if the user's question (or keywords) exist in the document text
    // You can improve this with fuzzy search, but start with a simple check.
    if (!allText.toLowerCase().includes(message.toLowerCase())) {
      const reply = "Sorry, I couldn't find an answer in our documents.";
      // Save to chat history
      const chat = new Chat({ message, reply, lang });
      await chat.save();
      return res.json({ reply });
    }

    // 3. Construct system and user prompts (same as before)
    const systemPrompt =
      "You are an insurance agent. You must answer ONLY using the provided documents. " +
      "If the answer is not present, reply: 'Sorry, I couldn't find an answer in our documents.' " +
      "Do NOT use your own knowledge. Do NOT make up answers.";
    const userPrompt =
      `Documents:\n${allText}\n\nQuestion: ${message}`;

    // 4. Send to OpenAI
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

    // Optional: Post-processing safety net (prevents hallucinated answers)
    if (
      reply.toLowerCase().includes("as an insurance agent") ||
      reply.toLowerCase().includes("i don't have that information") ||
      reply.toLowerCase().includes("insurance is") ||
      reply.trim() === "" ||
      reply.toLowerCase().includes("i am an ai language model")
    ) {
      reply = "Sorry, I couldn't find an answer in our documents.";
    }

    // Save to chat history
    const chat = new Chat({ message, reply, lang });
    await chat.save();

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI or Blob Storage.' });
  }
});

// Get chat history for a user
router.get('/history', async (req, res) => {
  // TODO: filter by user if email provided
  const history = await Chat.find().sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
