import 'dotenv/config';
import express from "express";
const app = express();
const PORT = process.env.PORT || 5500;
import fs from 'fs';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';
import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import { Accounts } from './assets/database.js';
import router from './routes/pages.js';
// Other
app.use(express.static(path.join(ROOT, 'client/static/')));
app.use(router);
app.listen(PORT, () => {
    console.log(logPrefix('Server'), `Server Started on ${ipv4}:${PORT}`);
});
