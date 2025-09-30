# Robin AI Insurance Agent – Professional Starter Project

Welcome to the Robin AI Insurance Agent starter repository!  
This project gives you a professional, scalable foundation for building a live, business-ready AI insurance agent accessible via web and mobile.

## Folder Structure

```
robin-ai-agent/
│
├── backend/          # Node.js/Express backend, connects to Azure
│   ├── .env          # Environment variables (API keys, endpoints)
│   ├── package.json  # Backend dependencies
│   ├── server.js     # Main backend server
│   └── ...           # More backend code (routes, models, etc.)
│
├── frontend/         # React.js frontend web app
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── ...       # More React components
│   ├── package.json  # Frontend dependencies
│   └── ...
│
├── mobile/           # Mobile app starter (Flutter or React Native)
│   └── README.md     # Instructions for mobile app setup
│
├── .gitignore        # Ignore node_modules, env files, etc.
└── README.md         # This file
```

---

## How to Use

1. **Clone the repo**:  
   `git clone https://github.com/YOURUSERNAME/robin-ai-agent.git`

2. **Backend Setup**:
   - Go to `backend/`, run:  
     `npm install`
   - Create `.env` with your Azure keys.
   - Start backend:  
     `node server.js`

3. **Frontend Setup**:
   - Go to `frontend/`, run:  
     `npm install`
   - Start frontend:  
     `npm start`
   - The web app runs at `http://localhost:3000` (or your chosen port).

4. **Mobile App**:  
   See the `mobile/README.md` for setup instructions.

---

## Next Steps

- Connect backend to Azure OpenAI, Cognitive Search, Blob Storage.
- Implement business logic: authentication, payment, chat history, agent workflows.
- Expand frontend with insurance flows, multilingual UI, business branding.
- Build and deploy your mobile app.

---
# robin-ai-agent Azure Deployment

## Prerequisites
- Node.js & npm installed
- Azure CLI installed and logged in (`az login`)
- ARM template in `infrastructure/template.json`

## Usage

```sh
npm run deploy
```

You will be prompted for:
- Environment name (used as prefix for all resources)
- Azure region
- Resource group name (default: <envName>Group)

Resources will be deployed per your environment. Outputs (endpoints, connection strings) are saved to `.env.<envName>`.
**This repo is ready for professional development, business deployment, and scaling!**
