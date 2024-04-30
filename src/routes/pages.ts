import express, { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import ROOT from '../assets/root.js'
import { logMSG } from '../assets/utils.js';
import Authentication from '../assets/authentication.js';
import jwt from 'jsonwebtoken'
import {accountInterface} from '../assets/database.js'

const files: string[] = await fs.readdir(path.join(ROOT, 'client/routes'), 'utf-8');
const routeFiles: string[] = files.filter(value => value.endsWith('.html'))

const routeFileURL: string[] = routeFiles.map(value => value.slice(0, value.length - 5).toLowerCase().replace(/[^a-z]/g, '-'))

const router: Router = express.Router()

const TokenAuthenticationRoutes: string[] = ['cloud']
const adminOnlyRoutes: string[] = []

for (let i = 0; i < routeFiles.length; i++) {
    if (routeFileURL[i] === 'index') {
        router.get(`/`, (req, res) => {
            try {
                res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`))
            } catch (error) {
                logMSG([`Unable to serve file: ${routeFiles[i]}`], [error], "Pages")
            }
        })
    } else {
        if (TokenAuthenticationRoutes.includes(routeFileURL[i])) {
            router.get(`/${routeFileURL[i]}`, Authentication.token, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`))
                } catch (error) {
                    logMSG([`Unable to serve file: ${routeFiles[i]}`], [error], "Pages")
                }
            })
        } else if (adminOnlyRoutes.includes(routeFileURL[i])) {
            router.get(`/${routeFileURL[i]}`, Authentication.tokenAdmin, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`))
                } catch (error) {
                    logMSG([`Unable to serve file: ${routeFiles[i]}`], [error], "Pages")
                }
            })
        } else {
            router.get(`/${routeFileURL[i]}`, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`))
                } catch (error) {
                    logMSG([`Unable to serve file: ${routeFiles[i]}`], [error], "Pages")
                }
            })
        }
    }
};
router.get('/cloud/u/', Authentication.token, (req, res)=>{
    res.sendFile(path.join(ROOT, 'client/page/cloud_interface.html'));
})

export default router