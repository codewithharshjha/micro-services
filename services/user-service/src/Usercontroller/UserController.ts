
import { Request, Response } from "express";
import { ZodError } from "zod";
import { prisma } from "../../db/PrismaDBClient";
import { userSchema } from "../Verification/UserVerification";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany()
        res.status(200).json({ message: "Users fetched successfully", users })
    } catch (error) {
        res.status(400).json({ message: "Error fetching users", error })
    }
}
export const RegisterUser = async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log("[RegisterUser] Starting user registration...");

    try {
        const { name, email, password, phone } = req.body;
        console.log("[RegisterUser] Request body received:", { name, email, phone: phone ? "***" : undefined });
        
        if (!name || !email || !password || !phone) {
            console.log("[RegisterUser] Missing required fields");
            return res.status(400).json({ message: "Invalid data" });
        }
        
        // 🔹 Validate with Zod
        console.log("[RegisterUser] Validating data with Zod...");
        const validatedData = userSchema.safeParse({ name, email, password, phone });

        if (validatedData.error) {
            console.log("[RegisterUser] Validation error:", validatedData.error);
            return res.status(400).json({ message: validatedData.error.message })
        }
        
        // 🔹 Check if user already exists
        console.log("[RegisterUser] Checking if user exists in database...");
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.data?.email! },
        });
        
        if (existingUser) {
            console.log("[RegisterUser] User already exists");
            return res.status(400).json({ message: "User already exists" });
        }

        // 🔹 Hash password
        console.log("[RegisterUser] Hashing password...");
        const hashedPassword = await bcrypt.hash(validatedData.data?.password as string, 10);

        // 🔹 Create user
        console.log("[RegisterUser] Creating user in database...");
        const user = await prisma.user.create({
            data: {
                name: validatedData.data?.name!,
                email: validatedData.data?.email!,
                phone: validatedData.data?.phone!,
                password: hashedPassword,
            },
        });

        const duration = Date.now() - startTime;
        console.log(`[RegisterUser] ✅ User created successfully in ${duration}ms`, { userId: user.id, email: user.email });
        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[RegisterUser] ❌ Error after ${duration}ms:`, error);
        console.error("[RegisterUser] Error stack:", (error as any).stack);

        return res.status(500).json({
            message: "Unexpected server error",
            error: (error as any).message,
        });
    }

};
export const LoginUser = async (req: Request, res: Response) => {

    try {
        const { email, password } = req.body
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return res.status(400).json({ message: "User not found" })
        }
        const ispasswordcorrect = await bcrypt.compare(password, user?.password as string)
        if (!ispasswordcorrect) {
            return res.status(400).json({ message: "Invalid password" })
        }
        const token = jwt.sign({ userId: user?.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" })
        res.status(200).json({ message: "Login successful", token })
    }
    catch (error) {
        res.status(400).json({ message: "Invalid-data", error })
    }
}