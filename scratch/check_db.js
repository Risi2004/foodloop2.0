const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB!");
    
    const db = mongoose.connection.db;
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    if (collections.some(c => c.name === 'users')) {
        const users = await db.collection('users').find({}).toArray();
        console.log("Users:", users.map(u => ({ email: u.email, role: u.role, isApproved: u.isApproved, isOtpVerified: u.isOtpVerified })));
    } else {
        console.log("No users collection found in default database.");
    }
    
    process.exit(0);
}).catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
});
