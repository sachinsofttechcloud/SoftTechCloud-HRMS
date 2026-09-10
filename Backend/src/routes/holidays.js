import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/annual-holidays", async (req, res) => {
    try {
        const holidays = await prisma.holiday.findMany({});
        res.status(200).json(holidays);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch holidays" });
    }
});

export default router;