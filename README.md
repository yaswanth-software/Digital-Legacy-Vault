# LegacyOS

**Your Digital Life. Your Rules. Your Legacy.**

## Overview

LegacyOS is a secure digital legacy management platform that allows users to organize important digital assets, assign trusted people, define granular access permissions, create conditional release rules, and control the secure release of selected digital assets after a verified legacy event.

## Core Concept

LegacyOS follows a clear workflow:

1. **Organize** — Upload and categorize your digital assets
2. **Protect** — Everything is secured with enterprise-grade security
3. **Assign** — Designate trusted people as asset recipients
4. **Define Rules** — Set conditions for asset release
5. **Verify** — Verification ensures releases happen correctly
6. **Release** — Assets are securely delivered at the right time

## Technology Stack

### Frontend
- React.js 19
- Vite 8
- JavaScript (ES Modules)
- Tailwind CSS 4
- React Router 7
- Axios
- Firebase Client SDK

### Backend
- Node.js
- Express.js 5
- JavaScript (ES Modules)
- Firebase Admin SDK
- dotenv
- cors

### Database & Auth
- Firebase Authentication (Email/Password)
- Firebase Firestore

## Project Structure

```
Digital Legacy Vault/
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── EmailVerificationPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── layouts/            # Layout wrappers
│   │   │   ├── PublicLayout.jsx
│   │   │   └── DashboardLayout.jsx
│   │   ├── services/           # API & Firebase services
│   │   │   ├── firebase.js
│   │   │   └── api.js
│   │   ├── context/            # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── routes/             # Route guards
│   │   │   └── ProtectedRoute.jsx
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── backend/                    # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── firebaseAdmin.js
│   │   ├── controllers/
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   ├── routes/
│   │   │   └── userRoutes.js
│   │   ├── services/
│   │   │   └── userService.js
│   │   ├── utils/
│   │   └── app.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 18+ installed
- A Firebase project with:
  - Authentication (Email/Password provider enabled)
  - Firestore Database created

## Firebase Setup

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps
3. Once created, click the gear icon → Project settings

### 2. Enable Authentication
1. Go to Authentication → Sign-in method
2. Enable **Email/Password** provider
3. Save

### 3. Create Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose your preferred location
4. Start in **test mode** for development (configure security rules later)

### 4. Get Frontend Firebase Config
1. Go to Project settings → General
2. Under "Your apps", click the web icon (`</>`)
3. Register your app (name it "LegacyOS Frontend")
4. Copy the `firebaseConfig` values

### 5. Get Backend Service Account
1. Go to Project settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file securely (do NOT commit it to git)
4. Use the values from this file for backend environment variables

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_PATH=service-account.json
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
```

## Installation

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
npm install
```

## Running Locally

### Start the Backend (Terminal 1)

```bash
cd backend
npm run dev
```

The backend runs at `http://localhost:5000`.
Health check: `http://localhost:5000/api/health`

### Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/users/me` | Yes | Get authenticated user profile |
| GET | `/api/vault/assets` | Yes | Retrieve all vault assets |
| POST | `/api/vault/assets` | Yes | Create a new asset |
| GET | `/api/vault/assets/:assetId` | Yes | Retrieve single asset details |
| PUT | `/api/vault/assets/:assetId` | Yes | Update asset metadata/fields |
| DELETE | `/api/vault/assets/:assetId` | Yes | Permanently delete asset |
| POST | `/api/vault/assets/:assetId/files` | Yes | Attach one or multiple files (max 5) |
| GET | `/api/vault/assets/:assetId/files` | Yes | List files attached to an asset |
| GET | `/api/vault/assets/:assetId/files/:fileId/download` | Yes | Generate short-lived secure download link |
| DELETE | `/api/vault/assets/:assetId/files/:fileId` | Yes | Permanently delete attached file |

## Current Development Status

### ✅ Day 1 — Completed
- Project foundation and structure
- Firebase Authentication (Email/Password)
- Email verification flow
- Firestore user profile creation
- Protected frontend routes
- Protected backend API with token verification
- Professional landing page
- Login, Register, Forgot Password pages
- Email verification page
- Basic dashboard with placeholder cards
- Centralized error handling
- Secure environment configuration

### ✅ Day 2 — Completed
- Digital Vault System (Create, View, Edit, Archive, and Delete assets)
- Asset categorization (Important Documents, Financial, Property, Insurance, etc.)
- Priority designations (Low, Medium, High, Critical)
- Dynamic search and filter tools on dashboard
- Protected asset verification guards

### ✅ Day 3 — Completed
- Firebase Storage Integration for secure binary assets
- File uploads with validation (max 10MB, blocked executables)
- Secure, short-lived signed URLs for downloads (valid for 5 mins)
- Denormalized statistic counters (total files, assets with/without files)
- Dynamic file uploader and preview/lightbox components

### 🔮 Future Development
- **Day 4**: Trusted People management
- **Day 5**: Permissions & Legacy Map
- **Day 6**: Release Rules engine
- **Day 7**: Check-in System
- **Day 8**: Verification & Controlled Release
- **Day 9**: Polish, Security Audit & Deployment

## Security

- All secrets loaded from environment variables
- Firebase Admin SDK runs only on the backend
- Firebase ID tokens verified on every protected endpoint
- No passwords stored in Firestore
- `.env` files excluded from version control
- Stack traces hidden in production

## License

Private — All rights reserved.
