import 'dotenv/config'

// Express
import express from "express";
const app = express()
const PORT: number = process.env.PORT? parseInt(process.env.PORT) : 5000;

// Built-in Modules
import fs from 'fs'
import path from 'path'
import os from 'os'

// Third Party Modules
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// Local Modules
import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import {Accounts} from './assets/database.js'

// Routers
import pagesRouter from './routes/pages.js' 
import APIRouter from './routes/api.js'

// Middlewares
app.use(express.static(path.join(ROOT, 'client/static/')))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json())

app.use('/', pagesRouter)
app.use('/', APIRouter)
app.listen(PORT, ()=>{
    console.log(logPrefix('Server'), `Server Started on http://${ipv4}:${PORT}`)
})

