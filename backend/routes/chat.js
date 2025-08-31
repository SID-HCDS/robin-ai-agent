console.log("DEBUG: chat.js loaded at", new Date().toISOString());

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

// Helper: Improved matching for relevant info
function hasRelevantInfo(message, allText) {
  const stopWords = [
    'the','is','at','which','on','and','a','an','to','for','from','in','of','by','with','as','about','this','that','it','are','was','be','has','have','will','you','your','we','us','our','can','should','could','would'
  ];
  const cleanedMessage = message.toLowerCase().replace(/[^\w\s]/gi, '');
  console.log("DEBUG: cleanedMessage:", cleanedMessage);

  const messageKeywords = cleanedMessage
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 2); // relax to >2 chars

  // Phrase match: check if any sentence from the question exists in blob text
  const sentences = message.split(/[.?!]/).map(s => s.trim().toLowerCase()).filter(s => s.length > 3);
  for (const sentence of sentences) {
    if (allText.toLowerCase().includes(sentence)) {
      console.log("MATCH: Sentence found in blob for message:", sentence);
      return true;
    }
  }

  // Keyword match: require at least 1 uncommon keyword
  let matchedKeywords = [];
  for (const word of messageKeywords) {
    if (allText.toLowerCase().includes(word)) {
      matchedKeywords.push(word);
    }
  }
  console.log("DEBUG: Matched keywords:", matchedKeywords);

  if (matchedKeywords.length >= 1) {
    console.log("MATCH: At least 1 uncommon keyword found for message:", message);
    return true;
  }

  return false;
}

router.post('/', async (req, res) => {
  console.log("DEBUG: chat.js POST handler reached");
  const { message, lang, email } = req.body;

  console.log('Received chat request:', { message, lang, email });

  try {
    // 1. Get all text from Blob Storage
    const allText = await getAllFilesText();
    console.log("DEBUG: allText length:", allText.length);

    // 2. Improved match: Only allow if relevant info present
    const allowed = hasRelevantInfo(message, allText);
    if (!allowed) {
      console.log('BLOCKED: No relevant info found in blob storage for message:', message);
      const reply = "Sorry, I couldn't find an answer in our documents.";
      const chat = new Chat({ message, reply, lang, email });
      await chat.save();
      return res.json({ reply });
    }
    console.log('ALLOWED: Relevant info found, sending to OpenAI for message:', message);

    // 3. Construct system and user prompts
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

    // Safety net for hallucinations
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
    const chat = new Chat({ message, reply, lang, email });
    await chat.save();

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI or Blob Storage.' });
  }
});

// Get chat history for a user
router.get('/history', async (req, res) => {
  const { email } = req.query;
  const filter = email ? { email } : {};
  const history = await Chat.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

module.exports = router;
