const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { rating, feedback } = req.body;
  // You can save feedback to DB here if needed
  console.log('Received feedback:', { rating, feedback });
  res.json({ status: "Feedback received" });
});

module.exports = router;
