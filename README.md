# Shree Janajagriti Boarding School Website

This workspace contains a simple static front‑end along with a lightweight Node.js/Express backend.

## Features added for "real world" backend

- Express server serving the UI and providing RESTful APIs
- SQLite database for contact messages (located in `data/school.db`)
- Endpoints:
  - `GET /api/facilities`  – returns JSON list of facilities
  - `GET /api/events`      – returns JSON list of events
  - `POST /api/contact`    – accepts form submissions and stores them in the database
  - `GET /api/contacts`    – returns all messages (for administrative use)

The front‑end (`new.html`) fetches the facilities/events lists and dynamically populates the page. A contact form sends data to the backend.

## Getting started

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```
2. **Start the server**:
   ```bash
   npm start
   ```
3. **Visit** http://localhost:3000 in your browser.  The homepage is served from `new.html`.

All frontend files (HTML/CSS/JS/images) reside in the project root.  You can add additional API endpoints in `server.js` and persist data in `db.js`.

> Tip: in a production setup replace SQLite with a managed database (Postgres/MongoDB) and add authentication before exposing `/api/contacts`.
