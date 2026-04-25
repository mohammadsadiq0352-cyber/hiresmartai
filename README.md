# 🎯 HireSmart — AI-Based Resume Screening System

HireSmart is a full-stack web application that uses NLP and AI to match candidate resumes against job descriptions. It supports two roles — **Candidates** and **HR/Company** — each with their own dashboard and features.

---

## 🚀 Features

### Candidate Role
- Sign up / Login with role-based authentication
- Upload and permanently store resumes in MongoDB (per user, persistent across devices)
- View, download, and delete stored resumes
- Analyze any stored resume against a job description
- See match score, classification, matched/missing skills

### HR / Company Role
- Bulk upload multiple candidate resumes
- Paste or upload a Job Description (PDF supported)
- AI-powered analysis and ranking of all resumes at once
- Detailed results with match scores, skill breakdown, and candidate summary
- Company profile page with member info

### General
- Google OAuth social login
- Forgot password with OTP email verification
- Role-based routing (Candidate ↔ HR)
- Fully dark-themed responsive UI

---

## 🛠️ Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | HTML, CSS, Vanilla JavaScript           |
| Backend   | Node.js, Express.js                     |
| Database  | MongoDB + GridFS (resume file storage)  |
| AI / NLP  | `natural`, `ml-distance`, `stopword`    |
| File Parse| `pdf-parse`, `mammoth`                  |
| Email     | Nodemailer (Gmail App Password)         |
| Auth      | JSON-based users + Google OAuth         |

---

## 📁 Project Structure

```
HireSmart-JS-AI/
├── backend/
│   ├── server.js          # Express server, all API routes
│   ├── aiMatcher.js       # NLP resume-JD matching engine
│   ├── users.json         # User store (JSON file)
│   ├── results.json       # Analysis results cache
│   └── package.json
│
└── frontend/
    ├── index.html              # Landing page
    ├── auth.html               # Login / Sign up (role-based)
    ├── auth.js                 # Auth logic
    ├── candidate-dashboard.html
    ├── hr-dashboard.html
    ├── profile.html            # Candidate profile + resume storage
    ├── company-profile.html    # HR company profile
    ├── forgot-pwd.html         # OTP password reset
    ├── script.js               # Shared dashboard logic
    └── style.css
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local, running on port 27017)

---

## 🔧 Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/your-username/HireSmart-JS-AI.git
cd HireSmart-JS-AI
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Start MongoDB

Make sure MongoDB is running locally:

```bash
# Windows (if installed as a service)
net start MongoDB

# macOS / Linux
mongod --dbpath /data/db
```

### 4. Start the server

```bash
node server.js
```

Server starts at **http://localhost:5000**

### 5. Open the app

Visit **http://localhost:5000** in your browser.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | `/api/auth/signup`          | Register new user        |
| POST   | `/api/auth/login`           | Login                    |
| POST   | `/api/auth/social-login`    | Google OAuth login       |
| POST   | `/api/auth/send-otp`        | Send password reset OTP  |
| POST   | `/api/auth/verify-otp`      | Verify OTP               |
| POST   | `/api/auth/reset-password`  | Reset password           |

### Resume Storage (MongoDB / GridFS)
| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | `/api/resumes/upload`           | Upload resume for a candidate      |
| GET    | `/api/resumes?userId=...`       | List all resumes for a user        |
| GET    | `/api/resumes/:id/file`         | Stream/download a resume file      |
| DELETE | `/api/resumes/:id`              | Delete a resume                    |
| POST   | `/api/resumes/:id/analyze`      | Analyze stored resume against JD   |

### Analysis
| Method | Endpoint    | Description                              |
|--------|-------------|------------------------------------------|
| POST   | `/analyze`  | Bulk analyze resumes against a JD (HR)   |

---

## 🔑 Environment Variables

You can override defaults using environment variables:

| Variable    | Default                                    | Description              |
|-------------|--------------------------------------------|--------------------------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/hiresmart`      | MongoDB connection string |
| `PORT`      | `5000`                                     | Server port              |

To use MongoDB Atlas instead of local:

```bash
set MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hiresmart
node server.js
```

---

## 👥 User Roles

| Role        | Login URL                        | Dashboard                  |
|-------------|----------------------------------|----------------------------|
| Candidate   | `/auth.html?role=user`           | `candidate-dashboard.html` |
| HR/Company  | `/auth.html?role=hr`             | `hr-dashboard.html`        |

---

## 📧 Email (OTP) Setup

The app uses Gmail to send OTP emails. To configure:

1. Enable 2-Step Verification on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Update `server.js`:

```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-16-char-app-password'
  }
});
```

---

## 📄 License

MIT License — free to use and modify.

---

> Built with ❤️ for the future of recruitment.
