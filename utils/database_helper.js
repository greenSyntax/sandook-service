const mongoose = require('mongoose')
require('dotenv').config();

module.exports = {
    databaseConnect: () => {
        // 🔌 MongoDB Connection
        // mongodb://localhost:27017/sandook-prod
        const databaseUrl = process.env.DB_URL
        mongoose.connect(databaseUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then(() => console.log("✅ Connected to Database"))
            .catch(err => console.error("❌ Database connection error:", err));
    }
}