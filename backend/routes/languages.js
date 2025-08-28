const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ languages: ["English", "Hindi", "Tamil", "Telugu"] });
});

module.exports = router;
