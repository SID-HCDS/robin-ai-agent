require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Models
const User = require('./models/User');
const Chat = require('./models/chat');

// Import Routers
const chatRouter = require('./routes/chat');
const callRouter = require('./routes/call');
const compareRouter = require('./routes/compare');
const feedbackRouter = require('./routes/feedback');
const languagesRouter = require('./routes/languages');
const paymentRouter = require('./routes/payment');
const healthRouter = require('./routes/healthcheck');
app.use('/api/health', healthRouter);

// --- DB CONNECTION ---
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

// --- CHAT ROUTES --- (all chat logic is now in routes/chat.js)
app.use('/api/chat', chatRouter);

// --- Other routers (if implemented), fallback to old endpoints if needed ---
app.use('/api/request-call', callRouter);
app.use('/api/compare', compareRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/payment', paymentRouter);

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

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.send('Robin AI Agent backend is running!');
});

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Robin AI Agent backend running on port ${PORT}`);
});
