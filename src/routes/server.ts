import 'dotenv/config'
import express from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import pagesRouter from "./pages.js";
import APIRouter from "./api.js";
import ROOT from "../assets/root.js";
import UI from '../assets/ui.js';
import path from 'path';
import ipv4 from '../assets/ipv4.js';
import env from '../assets/env.js';

export const PORT: number = env.PORT? parseInt(env.PORT) : 8080;
import config from '../assets/config.js';
export const app = express()
export const server = createServer(app)
export const origin = `http://${ipv4}:${PORT}`

app.use((req, res, next)=>{
    res.setHeader("Access-Control-Allow-Origin", config.serverConfig.allowOrigin.toString() )
    res.setHeader("Access-Control-Allow-Credentials", "false" )
    next()
})

app.use(express.static(path.join(ROOT, 'client/static/')))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json())

app.use('/', pagesRouter)
app.use('/', APIRouter)
app.use(function(req, res){
    res.status(404).send(UI.errorMSG(`404 - Not Found ${req.url}`))
})

export default server