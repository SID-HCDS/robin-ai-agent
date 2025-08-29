const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_BLOB_CONNECTION_STRING);
const containerName = 'your-container-name';

// Helper: Get all file contents from Blob Storage
async function getAllFilesText() {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  let allText = '';
  for await (const blob of containerClient.listBlobsFlat()) {
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    const downloadBlockBlobResponse = await blockBlobClient.downloadToBuffer();
    allText += downloadBlockBlobResponse.toString() + '\n'; // Add newline between files
  }
  return allText;
}

router.post('/', async (req, res) => {
  const { message, lang, email } = req.body;

  console.log('Received chat request:', { message, lang, email });
  
  try {
    // 1. Get all text from Blob Storage
    const allText = await getAllFilesText();

    // 2. Construct OpenAI prompt to answer ONLY from the provided documents
    const prompt = `
You are an insurance agent. Answer the user's question ONLY using the following documents. If the answer is not present, reply "Sorry, I couldn't find an answer in our documents."
Documents:
${allText}

Question: ${message}
`;

    // 3. Send to OpenAI
    const openaiResponse = await axios.post(
      process.env.AZURE_OPENAI_ENDPOINT,
      {
        messages: [
          { role: "system", content: "You are an insurance agent that answers ONLY from the provided documents." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = openaiResponse.data.choices[0]?.message?.content || 'No reply from AI';

    // Save to chat history
    const chat = new Chat({ message, reply, lang });
    await chat.save();

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI or Blob Storage.' });
  }
});

router.get('/history', async (req, res) => {
  const history = await Chat.find().sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
