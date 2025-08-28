require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Models
const User = require('./models/User');
const Chat = require('./models/chat');

mongoose.connect(process.env.DB_CONNECTION_STRING)
  .then(() => console.log('Connected to CosmosDB!'))
  .catch((err) => console.error('CosmosDB connection error:', err));

app.use(cors());
app.use(express.json());

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await require('bcryptjs').hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    const token = require('jsonwebtoken').sign({ email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user || !(await require('bcryptjs').compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = require('jsonwebtoken').sign({ email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- CHAT ROUTES ---
app.post('/api/chat', async (req, res) => {
  const { message, lang, email } = req.body;
  console.log('Received OpenAI chat request:', { message, lang, email });
  try {
    // Azure OpenAI call
    const openaiResponse = await axios.post(
      process.env.OPENAI_ENDPOINT, // e.g. https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15
      { messages: [{ role: "user", content: message }] },
      { headers: { 'api-key': process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' } }
    );
    console.log('OpenAI API response:', openaiResponse.data);
    const reply = openaiResponse.data.choices?.[0]?.message?.content || 'No reply from AI';
    const chat = new Chat({ message, reply, lang, email });
    await chat.save();
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI API error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
});

// Get chat history for a user
app.get('/api/chat/history', async (req, res) => {
  const { email } = req.query;
  const filter = email ? { email } : {};
  const history = await Chat.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ history });
});

// --- CALL ROUTES ---
app.post('/api/request-call', async (req, res) => {
  const { phone } = req.body;
  // TODO: Integrate with Azure Communication Services
  res.json({ status: "Call scheduled to " + phone });
});

// --- PAYMENT ROUTES ---
app.post('/api/payment', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
  res.json({
    clientSecret: 'demo_secret_key',
    message: 'Payment feature is not active yet. This is a placeholder response.'
  });
});

// --- INSURANCE ROUTES ---
app.get('/api/insurance', (req, res) => {
  res.json({
    products: [
      { type: "Life Insurance", description: "Protects your family." },
      { type: "Health Insurance", description: "Covers medical expenses." },
      { type: "Term Insurance", description: "Long-term coverage." }
    ]
  });
});

// Calculate premium
app.post('/api/calculate', (req, res) => {
  const { age, coverage, type } = req.body;
  let premium = 500 + (coverage || 100000) / 1000 + (age || 30) * 10;
  res.json({ premium });
});

// Recommend plan
app.post('/api/recommend', (req, res) => {
  const { age, budget } = req.body;
  if (age < 30 && budget > 500) {
    res.json({ recommended: "Term Insurance" });
  } else {
    res.json({ recommended: "Health Insurance" });
  }
});

// --- COMPARE ENDPOINT ---
app.post('/api/compare', (req, res) => {
  const { planA, planB } = req.body;
  // Dummy comparison
  res.json({ comparison: `Comparison between ${planA} and ${planB}: Both have pros and cons.` });
});

// --- FEEDBACK ENDPOINT ---
app.post('/api/feedback', (req, res) => {
  const { rating, feedback } = req.body;
  // Save to DB if needed (not implemented)
  res.json({ status: "Feedback received. Thank you!" });
});

// --- LANGUAGES ENDPOINT ---
app.get('/api/languages', (req, res) => {
  res.json({ languages: ["English", "Hindi", "Tamil", "Telugu"] });
});

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.send('Robin AI Agent backend is running!');
});

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Robin AI Agent backend running on port ${PORT}`);
});
