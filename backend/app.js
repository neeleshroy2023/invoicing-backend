require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const specs = require('./config/swagger');
const { connectDB } = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const { testEmailConnection } = require('./utils/emailSender');

// Import routes
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');

const app = express();

// Connect to database
connectDB();

// Test email connection
testEmailConnection();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing purposes
module.exports = app;