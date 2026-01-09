import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// Hybrid Database Utility
// Uses Vercel Postgres in production and fallbacks to JSON file in local dev

const DB_PATH = path.join(process.cwd(), 'src/data/users.json');
const MEMOS_PATH = path.join(process.cwd(), 'src/data/memos.json');

// Helper to check if we are in production/Vercel with DB setup
const isProductionDB = !!process.env.POSTGRES_URL;

export async function getUsers() {
    if (isProductionDB) {
        try {
            const { rows } = await sql`SELECT * FROM users`;
            return rows;
        } catch (error) {
            console.error('[DB] Error fetching users from Postgres:', error);
            return [];
        }
    } else {
        // Local JSON Fallback
        if (!fs.existsSync(DB_PATH)) return [];
        const content = fs.readFileSync(DB_PATH, 'utf8');
        // Strip UTF-8 BOM if present
        const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
        try {
            return JSON.parse(cleanContent);
        } catch (e) {
            console.error('[DB] Failed to parse users.json:', e);
            return [];
        }
    }
}

export async function getUserByEmailOrUsername(identifier: string) {
    if (!identifier) return null;
    const id = identifier.toLowerCase();
    if (isProductionDB) {
        try {
            const { rows } = await sql`SELECT * FROM users WHERE LOWER(email) = ${id} OR LOWER(username) = ${id} LIMIT 1`;
            return rows[0] || null;
        } catch (error) {
            return null;
        }
    } else {
        const users = await getUsers();
        return users.find((u: any) => u.email?.toLowerCase() === id || u.username?.toLowerCase() === id) || null;
    }
}

export async function createUser(userData: any) {
    if (isProductionDB) {
        try {
            const { username, password, email, walletAddress, role, walletType, userId } = userData;
            await sql`
                INSERT INTO users (username, password, email, wallet_address, role, wallet_type, user_id)
                VALUES (${username}, ${password}, ${email}, ${walletAddress}, ${role}, ${walletType}, ${userId})
            `;
            return { success: true };
        } catch (error: any) {
            console.error('[DB] Error creating user in Postgres:', error.message);
            throw error;
        }
    } else {
        const users = await getUsers();

        // Ensure data directory exists for local
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        users.push({
            ...userData,
            createdAt: new Date().toISOString()
        });
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
        return { success: true };
    }
}

// Utility to initialize the table (must be called manually or via init-db route)
export async function setupTables() {
    if (isProductionDB) {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                wallet_address TEXT,
                role TEXT,
                wallet_type TEXT,
                user_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log('[DB] Tables initialized successfully');
    }
}

export async function updateUserPassword(username: string, newPassword: string) {
    if (isProductionDB) {
        try {
            await sql`
                UPDATE users SET password = ${newPassword} WHERE username = ${username}
            `;
            return { success: true };
        } catch (error: any) {
            console.error('[DB] Error updating password in Postgres:', error.message);
            throw error;
        }
    } else {
        const users = await getUsers();
        const userIndex = users.findIndex((u: any) => u.username === username);

        if (userIndex === -1) {
            throw new Error(`User ${username} not found`);
        }

        users[userIndex].password = newPassword;
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
        return { success: true };
    }
}

export async function updateUserUserId(username: string, userId: string) {
    if (isProductionDB) {
        try {
            await sql`
                UPDATE users SET user_id = ${userId} WHERE username = ${username}
            `;
            return { success: true };
        } catch (error: any) {
            console.error('[DB] Error updating userId in Postgres:', error.message);
            throw error;
        }
    } else {
        const users = await getUsers();
        const userIndex = users.findIndex((u: any) => u.username === username);

        if (userIndex === -1) {
            throw new Error(`User ${username} not found`);
        }

        users[userIndex].userId = userId;
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
        return { success: true };
    }
}

export async function getSocialPayments(userAddress: string) {
    if (isProductionDB) {
        try {
            const { rows } = await sql`
                SELECT * FROM social_payments 
                WHERE from_address = ${userAddress} OR to_address = ${userAddress}
                ORDER BY created_at DESC
            `;
            return rows;
        } catch (error) {
            console.error('[DB] Error fetching memos:', error);
            return [];
        }
    } else {
        if (!fs.existsSync(MEMOS_PATH)) return [];
        const content = fs.readFileSync(MEMOS_PATH, 'utf8');
        const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
        const memos = JSON.parse(cleanContent);
        return memos.filter((m: any) =>
            m.fromAddress?.toLowerCase() === userAddress?.toLowerCase() ||
            m.toAddress?.toLowerCase() === userAddress?.toLowerCase()
        ).reverse();
    }
}

export async function createSocialPayment(data: any) {
    if (isProductionDB) {
        try {
            const { txHash, fromAddress, toAddress, amount, memo, symbol } = data;
            await sql`
                INSERT INTO social_payments (tx_hash, from_address, to_address, amount, memo, symbol)
                VALUES (${txHash}, ${fromAddress}, ${toAddress}, ${amount}, ${memo}, ${symbol})
            `;
            return { success: true };
        } catch (error: any) {
            console.error('[DB] Error creating memo:', error.message);
            throw error;
        }
    } else {
        if (!fs.existsSync(MEMOS_PATH)) return { success: true };
        const content = fs.readFileSync(MEMOS_PATH, 'utf8');
        const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
        const memos = JSON.parse(cleanContent);
        memos.push({
            ...data,
            createdAt: new Date().toISOString()
        });
        fs.writeFileSync(MEMOS_PATH, JSON.stringify(memos, null, 2));
        return { success: true };
    }
}

export async function updateUserCircleId(username: string, userId: string) {
    if (isProductionDB) {
        try {
            await sql`
                UPDATE users SET user_id = ${userId} WHERE username = ${username}
            `;
            return { success: true };
        } catch (error: any) {
            console.error('[DB] Error updating user_id in Postgres:', error.message);
            throw error;
        }
    } else {
        const users = await getUsers();
        const userIndex = users.findIndex((u: any) => u.username === username);

        if (userIndex !== -1) {
            users[userIndex].userId = userId;
            fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
        }
        return { success: true };
    }
}
