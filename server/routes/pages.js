import express, { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import ROOT from '../assets/root.js';
import { logMSG } from '../assets/utils.js';
import Authentication from '../assets/authentication.js';
import jwt from 'jsonwebtoken';
import logPrefix from '../assets/log.js';
import env from '../assets/env.js';
const files = await fs.readdir(path.join(ROOT, 'client/routes'), 'utf-8');
const routeFiles = files.filter(value => value.endsWith('.html'));
const routeFileURL = routeFiles.map(value => value.slice(0, value.length - 5).toLowerCase().replace(/[^a-z]/g, '-'));
const router = express.Router();
const TokenAuthenticationRoutes = ['cloud'];
const adminOnlyRoutes = [];
for (let i = 0; i < routeFiles.length; i++) {
    if (routeFileURL[i] === 'index') {
        router.get(`/`, (req, res) => {
            try {
                res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`));
            }
            catch (error) {
                logMSG("Pages", `Unable to serve file: ${routeFiles[i]}`);
            }
        });
    }
    else {
        if (TokenAuthenticationRoutes.includes(routeFileURL[i])) {
            router.get(`/${routeFileURL[i]}`, Authentication.token, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`));
                }
                catch (error) {
                    logMSG("Pages", `Unable to serve file: ${routeFiles[i]}`);
                }
            });
        }
        else if (adminOnlyRoutes.includes(routeFileURL[i])) {
            router.get(`/${routeFileURL[i]}`, Authentication.tokenAdmin, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`));
                }
                catch (error) {
                    logMSG("Pages", `Unable to serve file: ${routeFiles[i]}`);
                }
            });
        }
        else {
            router.get(`/${routeFileURL[i]}`, (req, res) => {
                try {
                    res.sendFile(path.join(ROOT, `client/routes/${routeFiles[i]}`));
                }
                catch (error) {
                    logMSG("Pages", `Unable to serve file: ${routeFiles[i]}`);
                }
            });
        }
    }
}
;
router.get('/cloud/u/', Authentication.token, (req, res) => {
    res.sendFile(path.join(ROOT, 'client/page/cloud_interface.html'));
});
router.get('/get/admin-dashboard-url', Authentication.tokenAdminAPI, (req, res) => {
    res.status(200).send({ data: `/${env.ADMIN_PAGE_URL}` });
});
router.get(`/${env.ADMIN_PAGE_URL}`, Authentication.tokenAdmin, (req, res) => {
    res.sendFile(path.join(ROOT, `client/page/admin.html`));
});
export default router;
