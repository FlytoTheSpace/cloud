import 'dotenv/config'
import env from './assets/env.js'
// Express
import express from "express";

// Built-in Modules
import fs from 'fs'
import path from 'path'
import os from 'os'
import {exec} from 'child_process';

// Third Party Modules
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// Local Modules
import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import {Accounts} from './assets/database.js'
import config from './assets/config.js';

// Routers
import pagesRouter from './routes/pages.js' 
import APIRouter from './routes/api.js'
import UI from './assets/ui.js';

const app = express()
const PORT: number = env.PORT? parseInt(env.PORT) : 8080;

// Middlewares
app.use(express.static(path.join(ROOT, 'client/static/')))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json())

app.use('/', pagesRouter)
app.use('/', APIRouter)
app.use(function(req, res){
    res.status(404).send(UI.errorMSG(`404 - Not Found ${req.url}`))
})
app.listen(PORT, ()=>{
    const link = `http://${ipv4}:${PORT}`
    console.log(logPrefix('Server'), `Server Started on ${link}`)
    if(config.serverConfig.browserOnRun === true, config.serverConfig.devMode === false){
        if(config.serverConfig.firstrun === true){
            exec(`start ${link}/register`, ()=>{})
        }
        exec(`start ${link}`, ()=>{})
    }
})

