const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/animals', require('./routes/animalRoutes'));
app.use('/api/eggs', require('./routes/eggRoutes'));
app.use('/api/flocks', require('./routes/flockRoutes'));
const feedInventoryRoutes = require('./routes/feedInventoryRoutes');
app.use('/api/feed-inventory', feedInventoryRoutes);
const feedLogRoutes = require('./routes/feedLogRoutes');
app.use('/api/feed-log', feedLogRoutes);
const mortalityRoutes = require('./routes/mortalityRoutes');
app.use('/api/mortality', mortalityRoutes);
const replacementRoutes = require('./routes/replacementRoutes');
app.use('/api/replacements', replacementRoutes);
const expenseRoutes = require('./routes/expenseRoutes');
app.use('/api/expenses', expenseRoutes);
const salesRoutes = require('./routes/salesRoutes');
app.use('/api/sales', salesRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);
const vaccinationRoutes = require('./routes/vaccinationRoutes');
app.use('/api/vaccination', vaccinationRoutes);
const treatmentRoutes = require('./routes/treatmentRoutes');
app.use('/api/treatment', treatmentRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('Poultry Farm Management API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});