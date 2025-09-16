const express = require('express');
const router = express.Router();

router.get('/secrets', (req, res) => {
  const required = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_DEPLOYMENT_ID',
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_API_KEY',
    'AZURE_AI_SEARCH_INDEX',
    'DB_CONNECTION_STRING',
    'JWT_SECRET'
  ];
  const result = {};
  required.forEach(k => {
    result[k] = !!process.env[k] ? 'OK' : 'MISSING';
  });
  res.json(result);
});

module.exports = router;
