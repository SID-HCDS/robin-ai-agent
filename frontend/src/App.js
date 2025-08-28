import React, { useState } from 'react';
import './style.css';

const API_BASE = 'https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net';

function App() {
  const [language, setLanguage] = useState('');
  const [output, setOutput] = useState('');

  const chooseLanguage = () => {
    setOutput(`Hello! Robin welcomes you in ${language}`);
  };

  const getInsuranceInfo = async () => {
    const res = await fetch(`${API_BASE}/api/insurance`);
    const data = await res.json();
    setOutput(
      'Insurance Types:\n' +
        data.products.map(p => `${p.type}: ${p.description}`).join('\n')
    );
  };

  const calculatePremium = async () => {
    const age = prompt('Enter your age:');
    const coverage = prompt('Enter coverage amount:');
    const res = await fetch(`${API_BASE}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: Number(age), coverage: Number(coverage) }),
    });
    const data = await res.json();
    setOutput(`Your Premium: ₹${data.premium}`);
  };

  const recommendPlan = async () => {
    const age = prompt('Enter your age:');
    const budget = prompt('Enter your budget:');
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: Number(age), budget: Number(budget) }),
    });
    const data = await res.json();
    setOutput(`Recommended Plan: ${data.recommended}`);
  };

  return (
    <div className="container">
      <h1>Robin AI Insurance Agent</h1>
      <label>Select your language: </label>
      <select
        value={language}
        onChange={e => setLanguage(e.target.value)}
        style={{ marginRight: 10 }}
      >
        <option value="">--Choose--</option>
        <option value="English">English</option>
        <option value="Hindi">Hindi</option>
        <option value="Tamil">Tamil</option>
        <option value="Telugu">Telugu</option>
      </select>
      <button onClick={chooseLanguage}>Continue</button>
      <hr />
      <button onClick={getInsuranceInfo}>Show Insurance Types</button>
      <button onClick={calculatePremium}>Calculate Premium</button>
      <button onClick={recommendPlan}>Recommend a Plan</button>
      {/* Add more buttons for payment, call, chat history as you build */}
      <div className="output-box">
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default App;
