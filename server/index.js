import 'dotenv/config';
import express from "express";
const app = express();
const PORT = process.env.PORT || 5500;
import path from 'path';
import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT, "client/routes/index.html"));
});
app.listen(PORT, () => {
    console.log(`[Server] Server Started on ${ipv4}:${PORT}`);
});
