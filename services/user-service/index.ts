import { prisma } from "./db/PrismaDBClient.js"
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import userRoute from "./src/UserRoute/userRoute.js"
import passport from "./src/config/passpord.js"
import session from "express-session"
dotenv.config()
const app=express()

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
        body: req.body,
        query: req.query
    });
    next();
});

app.use(express.json()); // 👈 this must come before routes
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
    })
  );
  
  app.use(passport.initialize());
  app.use(passport.session());

app.use("/api/v1/auth",userRoute)
console.log("User service is running on port 4001")
// Test database connection on startup
async function testDatabaseConnection() {
    try {
        console.log("Testing database connection...");
        console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
        await prisma.$connect();
        console.log("✅ Database connection successful!");
        
        // Try a simple query
       
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        console.error("Error details:", (error as any).message);
    }
}

const PORT=process.env.PORT||4001
app.listen(PORT, async ()=>{
    console.log(`User service is running on port ${PORT}`)
    await testDatabaseConnection();
})