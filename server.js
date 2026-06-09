const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');

// simple in-memory / sqlite storage
const { initDb, getDb } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Email configuration - UPDATE THESE WITH YOUR EMAIL CREDENTIALS
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'janajagritiss@gmail.com', // Your Gmail address
    pass: 'YOUR_APP_PASSWORD' // Gmail app password (not regular password)
  }
});

// middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve static frontend files from workspace root (css, images, other html)
app.use(express.static(path.join(__dirname)));
// serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// make new.html the main entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'new.html'));
});

// sample data used for initial seeding; persistent storage lives in SQLite now
const facilities = [
  { icon: '🏛️', name: 'Spacious Classrooms', description: 'Well-ventilated rooms with blackboards and desks for 40–50 students.' },
  { icon: '🔬', name: 'Science Laboratories', description: 'Basic physics, chemistry & biology equipment for practical experiments.' },
  { icon: '💻', name: 'Computer Lab', description: '10–20 desktops for IT education and digital literacy.' },
  { icon: '📚', name: 'Library', description: 'Textbooks, reference books and a quiet reading space.' },
  { icon: '⚽', name: 'Playground', description: 'Ground for football, volleyball, athletics, promoting fitness.' },
  { icon: '🏠', name: 'Boarding Hostel', description: 'Clean dorms, mess hall with balanced meals, warden supervision.' },
  { icon: '💧', name: 'Water & Sanitation', description: 'Tube wells, toilets and hygiene facilities meeting government norms.' },
  { icon: '🚗', name: 'Transport', description: 'School buses/vans for day scholars from nearby areas.' },
];

const events = [
  { title: 'National Festivals', description: 'Dashain, Tihar celebrations with cultural programs.' },
  { title: 'Sports Week', description: 'Inter-house competitions in standard sports.' },
  { title: 'Annual Day', description: 'Achievements showcase with parent involvement.' },
  { title: 'Educational Tours', description: 'Field trips to historical sites.' },
];

// helpers to interact with the database for facilities/events
function queryFacilities(res) {
  const db = getDb();
  db.all('SELECT * FROM facilities', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
}

function queryEvents(res) {
  const db = getDb();
  db.all('SELECT * FROM events', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
}

// API
app.get('/api/facilities', (req, res) => {
  queryFacilities(res);
});

app.get('/api/events', (req, res) => {
  queryEvents(res);
});

// allow adding new items (e.g. from an admin form)
app.post('/api/facilities', (req, res) => {
  const { icon, name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  const db = getDb();
  db.run(
    'INSERT INTO facilities (icon, name, description) VALUES (?,?,?)',
    [icon || '', name, description],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      queryFacilities(res);
    }
  );
});

app.post('/api/events', (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  const db = getDb();
  db.run(
    'INSERT INTO events (title, description) VALUES (?,?)',
    [title, description],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      queryEvents(res);
    }
  );
});

// gallery API
app.get('/api/gallery', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM gallery ORDER BY uploaded_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/gallery', upload.single('image'), (req, res) => {
  const { caption } = req.body;
  const filename = req.file ? req.file.filename : null;
  if (!filename) {
    return res.status(400).json({ success: false, error: 'No image uploaded' });
  }
  const db = getDb();
  db.run(
    'INSERT INTO gallery (filename, caption) VALUES (?,?)',
    [filename, caption || ''],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      // return updated gallery list
      db.all('SELECT * FROM gallery ORDER BY uploaded_at DESC', (err2, rows) => {
        if (err2) return res.status(500).json({ success: false, error: 'Database error' });
        res.json(rows);
      });
    }
  );
});

app.delete('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // First get the filename to delete the file
  db.get('SELECT filename FROM gallery WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: 'Database error' });
    if (!row) return res.status(404).json({ success: false, error: 'Image not found' });

    // Delete the file from filesystem
    const filePath = path.join(__dirname, 'uploads', row.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error('Error deleting file:', fileErr);
    }

    // Delete from database
    db.run('DELETE FROM gallery WHERE id = ?', [id], function (err2) {
      if (err2) return res.status(500).json({ success: false, error: 'Database error' });

      // Return updated gallery list
      db.all('SELECT * FROM gallery ORDER BY uploaded_at DESC', (err3, rows) => {
        if (err3) return res.status(500).json({ success: false, error: 'Database error' });
        res.json(rows);
      });
    });
  });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO contacts (name,email,message) VALUES (?,?,?)',
    [name, email, message],
    async function (err) {
      if (err) {
        console.error('db error', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }

      // Send email notification
      try {
        await emailTransporter.sendMail({
          from: 'janajagritiss@gmail.com',
          to: 'janajagritiss@gmail.com', // Send to school email
          subject: 'New Contact Form Message',
          html: `
            <h3>New message from ${name}</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        });
        console.log('Email sent successfully');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails, just log it
      }

      res.json({ success: true, id: this.lastID });
    }
  );
});

// admin endpoint to view messages (in real world you'd protect this)
app.get('/api/contacts', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// fall back to new.html for any path not matched above (client-side routing support)
// use a regular expression pattern (.*) to avoid path-to-regexp parameter errors
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'new.html'));
});

// ensure database tables are seeded with default data if empty
function seedData() {
  const db = getDb();
  db.get('SELECT COUNT(*) AS cnt FROM facilities', (err, row) => {
    if (err) return console.error('seed error', err);
    if (row.cnt === 0) {
      const stmt = db.prepare('INSERT INTO facilities (icon, name, description) VALUES (?,?,?)');
      facilities.forEach(f => stmt.run(f.icon, f.name, f.description));
      stmt.finalize();
    }
  });
  db.get('SELECT COUNT(*) AS cnt FROM events', (err, row) => {
    if (err) return console.error('seed error', err);
    if (row.cnt === 0) {
      const stmt = db.prepare('INSERT INTO events (title, description) VALUES (?,?)');
      events.forEach(e => stmt.run(e.title, e.description));
      stmt.finalize();
    }
  });
}

initDb();
seedData();
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
