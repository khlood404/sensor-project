// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// استدعاء الروتس
const sensorRoutes = require('./routes/sensorRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // لتفريغ الـ JSON
app.use(morgan('dev')); // logging للـ requests

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/sensorDB';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/sensors', sensorRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Sensor API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
