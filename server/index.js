import 'dotenv/config';
// Express
import express from "express";
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
// Built-in Modules
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
// Third Party Modules
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
// Local Modules
import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import { Accounts } from './assets/database.js';
import config from './assets/config.js';
// Routers
import pagesRouter from './routes/pages.js';
import APIRouter from './routes/api.js';
// Middlewares
app.use(express.static(path.join(ROOT, 'client/static/')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use('/', pagesRouter);
app.use('/', APIRouter);
app.listen(PORT, () => {
    const link = `http://${ipv4}:${PORT}`;
    console.log(logPrefix('Server'), `Server Started on ${link}`);
    if (config.serverConfig.browserOnRun === true, config.serverConfig.devMode === false) {
        if (config.serverConfig.firstrun === true) {
            exec(`start ${link}/register`, () => { });
        }
        exec(`start ${link}`, () => { });
    }
});
