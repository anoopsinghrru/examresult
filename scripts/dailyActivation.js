const mongoose = require('mongoose');
const Student = require('../models/Student');
require('dotenv').config();

// Database connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI ;
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Daily activation script
const runDailyActivation = async () => {
    try {
        console.log('Starting daily activation script...');
        
        // Get today's date range (start and end of today)
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        console.log(`Today's date range: ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`);
        
        // Step 1: Deactivate all students created before today
        const deactivateResult = await Student.updateMany(
            { 
                createdAt: { $lt: startOfToday }
            },
            { active: false }
        );
        
        console.log(`✓ Deactivated ${deactivateResult.modifiedCount} students created before today`);
        
        // Step 2: Activate all students created today
        const activateResult = await Student.updateMany(
            { 
                createdAt: { 
                    $gte: startOfToday,
                    $lt: endOfToday 
                }
            },
            { active: true }
        );
        
        console.log(`✓ Activated ${activateResult.modifiedCount} students created today`);
        
        // Step 3: Get summary statistics
        const totalStudents = await Student.countDocuments();
        const activeStudents = await Student.countDocuments({ active: true });
        const inactiveStudents = await Student.countDocuments({ active: false });
        const todayStudents = await Student.countDocuments({
            createdAt: { 
                $gte: startOfToday,
                $lt: endOfToday 
            }
        });
        
        console.log('\n=== SUMMARY ===');
        console.log(`Total students: ${totalStudents}`);
        console.log(`Active students: ${activeStudents}`);
        console.log(`Inactive students: ${inactiveStudents}`);
        console.log(`Students created today: ${todayStudents}`);
        
        console.log('\n✅ Daily activation script completed successfully!');
        
    } catch (error) {
        console.error('❌ Error running daily activation script:', error);
        throw error;
    }
};

// Main execution function
const runStandalone = async () => {
    try {
        await connectDB();
        await runDailyActivation();
        
        console.log('\nClosing database connection...');
        await mongoose.connection.close();
        console.log('Database connection closed.');
        
        process.exit(0);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
};

// Run the script if executed directly
if (require.main === module) {
    console.log('🚀 Starting Daily Activation Script');
    console.log('This script will:');
    console.log('1. Deactivate all students created before today');
    console.log('2. Activate all students created today');
    console.log('3. Show summary statistics\n');
    
    runStandalone();
}

module.exports = { runDailyActivation, runStandalone };
