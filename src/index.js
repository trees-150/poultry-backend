const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// Auth (unprotected)
app.use('/api/auth', require('./routes/authRoutes'));

// Middleware for protected routes
const auth = require('./middleware/auth');

app.use('/api/animals', require('./routes/animalRoutes'));
app.use('/api/eggs', require('./routes/eggRoutes'));
app.use('/api/flocks', auth, require('./routes/flockRoutes'));
const farmRoutes = require('./routes/farmRoutes');
app.use('/api/farms', auth, farmRoutes);
const feedInventoryRoutes = require('./routes/feedInventoryRoutes');
app.use('/api/feed-inventory', auth, feedInventoryRoutes);
const feedLogRoutes = require('./routes/feedLogRoutes');
app.use('/api/feed-log', auth, feedLogRoutes);
const mortalityRoutes = require('./routes/mortalityRoutes');
app.use('/api/mortality', auth, mortalityRoutes);
const replacementRoutes = require('./routes/replacementRoutes');
app.use('/api/replacements', auth, replacementRoutes);
const expenseRoutes = require('./routes/expenseRoutes');
app.use('/api/expenses', auth, expenseRoutes);
const salesRoutes = require('./routes/salesRoutes');
app.use('/api/sales', auth, salesRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', auth, dashboardRoutes);
const vaccinationRoutes = require('./routes/vaccinationRoutes');
app.use('/api/vaccination', auth, vaccinationRoutes);
const treatmentRoutes = require('./routes/treatmentRoutes');
app.use('/api/treatment', auth, treatmentRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('Poultry Farm Management API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});