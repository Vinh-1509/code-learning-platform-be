import { Request, Response } from "express";
import Data from "../models/data.model";

export const getData = async (req: Request, res: Response) => {
    try {
        const data = await Data.find();
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};
