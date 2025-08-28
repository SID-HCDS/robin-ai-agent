const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { planA, planB } = req.body;
  // Dummy comparison for demo
  res.json({ comparison: `Plan ${planA} offers more coverage, Plan ${planB} is cheaper.` });
});

module.exports = router;
