import 'dotenv/config'
import express from "express";
const app = express()
const PORT = process.env.PORT || 5500

import fs from 'fs'
import path from 'path'
import os from 'os'

import ROOT from './assets/root.js';
import ipv4 from './assets/ipv4.js';
import mongoose from 'mongoose';

app.get('/', (req, res)=>{
    res.sendFile(path.join(ROOT, "client/routes/index.html"));
})
app.listen(PORT, ()=>{
    console.log(`[Server] Server Started on ${ipv4}:${PORT}`)
})