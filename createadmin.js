
const mongoose = require('mongoose');
require('dotenv').config();

// Import Admin model
const Admin = require('./models/Admin'); // adjust path if needed

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/omr_results');
        console.log('Connected to MongoDB');

        const adminUsername = 'omr_sys_ctrl_2025';
        const adminPassword = 'spicsmadmin240031101631008'; // plain password, let model hash it

        // Delete previous admin if exists
        await Admin.deleteMany({ username: adminUsername });
        console.log(`✓ Existing admin(s) with username '${adminUsername}' deleted`);

        // Create new admin (password will be hashed automatically by model pre-save)
        await Admin.create({ username: adminUsername, password: adminPassword });
        console.log(`✓ New admin created: ${adminUsername}`);

    } catch (error) {
        console.error('❌ Admin creation failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
createAdmin();

