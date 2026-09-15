# Community Safety & Incident Tracker

A simple and practical neighborhood safety reporting system for residents, volunteers, and local admins to report, monitor, and manage local incidents.

For the 1M1B AI for Sustainability Virtual Internship submission, see [PROJECT_SUBMISSION.md](PROJECT_SUBMISSION.md). The document distinguishes the working tracker from the proposed AI-assisted triage and retrieval workflow.

## Features
- **User Authentication**: Simple login with roles (admin, analyst, viewer).
- **Incident Management**: CRUD operations with role-based access control and file attachments.
- **Real-Time Alerts**: Live alert ticker powered by Server-Sent Events (SSE).
- **Internal Messaging**: Direct and broadcast messaging.
- **Audit Logs**: Track user actions.
- **Data Export/Import**: Download or replace incidents data (JSON/CSV).
- **Responsive UI**: Clean dashboard with dark/light mode toggle.

## Tech Stack
- **Backend**: Node.js, Express.js, better-sqlite3, bcryptjs, jsonwebtoken, multer, dotenv
- **Frontend**: HTML, CSS (Vanilla), JavaScript (Vanilla)

## Setup & Execution

### Prerequisites
- Node.js (v14 or higher recommended)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables:
   Copy `.env.example` to `.env` and configure your settings.
   ```bash
   cp .env.example .env
   ```

### Running the Application
Start the server:
```bash
npm start
```
The application will be accessible at `http://localhost:3000`.

### Default Accounts
On the first run, the database is automatically seeded with these accounts:
- **Admin**: `admin` / `admin123`
- **Analyst**: `analyst` / `analyst123`
- **Viewer**: `viewer` / `viewer123`
