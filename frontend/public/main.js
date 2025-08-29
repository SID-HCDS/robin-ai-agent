let selectedLanguage = "English";
let conversation = [];
let paymentAmount = null;

function setLanguage() {
  selectedLanguage = document.getElementById('language-select').value;
  greetUser();
}

function greetUser() {
  document.getElementById('conversation').innerHTML =
    `<div class="ai-message">Hello! Welcome to Robin AI. Please choose your language.</div>`;
}

function showLogin() {
  alert("Login/Register functionality coming soon.");
}

function getInsuranceInfo() {
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/insurance')
    .then(res => res.json())
    .then(data => {
      addMessage("ai", "Insurance Types:<br>" + data.products.map(p => `<b>${p.type}:</b> ${p.description}`).join('<br>'));
    });
}

function comparePlans() {
  const planA = prompt("Enter first plan to compare:");
  const planB = prompt("Enter second plan to compare:");
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/compare', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planA, planB })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", "Comparison:<br>" + data.comparison);
    });
}

function calculatePremium() {
  const age = prompt("Enter your age:");
  const coverage = prompt("Enter coverage amount:");
  const type = prompt("Enter insurance type:");
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/calculate', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ age, coverage, type })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", "Calculated Premium: ₹" + data.premium);
      paymentAmount = data.premium;
      document.getElementById('payment-btn').style.display = "block";
    });
}

function recommendPlan() {
  const age = prompt("Enter your age:");
  const budget = prompt("Enter your budget:");
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/recommend', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ age, budget })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", "Recommended Plan: " + data.recommended);
    });
}

function requestCall() {
  const phone = prompt("Enter your phone number for call:");
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/request-call', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", data.status);
    });
}

function makePayment() {
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/payment', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: paymentAmount })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", `Proceed to payment: <a href="https://pay.stripe.com/${data.clientSecret}" target="_blank">Pay Now</a>`);
    });
}

function sendMessage() {
  const input = document.getElementById('user-input').value;
  if (!input) return;
  addMessage("user", input);
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/chat', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input, lang: selectedLanguage })
  })
    .then(res => res.json())
    .then(data => {
      addMessage("ai", data.reply);
      askForFeedback();
    });
  document.getElementById('user-input').value = "";
}

function startVoice() {
  alert("Voice feature coming soon.");
}

function addMessage(sender, text) {
  conversation.push({ sender, text });
  renderConversation();
}

function renderConversation() {
  document.getElementById('conversation').innerHTML =
    conversation.map(msg => `<div class="${msg.sender}-message">${msg.text}</div>`).join('');
}

function askForFeedback() {
  document.getElementById('feedback-area').style.display = "block";
}

function sendFeedback() {
  const rating = document.getElementById('rating').value;
  const feedback = document.getElementById('feedback-text').value;
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/feedback', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, feedback })
  })
    .then(res => res.json())
    .then(data => {
      alert("Thank you for your feedback!");
      document.getElementById('feedback-area').style.display = "none";
    });
}

window.onload = function() {
  fetch('https://robinbackend-bzgkfnhndvcmdee3.eastus2-01.azurewebsites.net/api/languages')
    .then(res => res.json())
    .then(data => {
      const sel = document.getElementById('language-select');
      data.languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = lang;
        sel.appendChild(opt);
      });
      sel.value = "English";
      greetUser();
    });
};
