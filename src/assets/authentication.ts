import 'dotenv'
import path from 'path';
import {Accounts} from'./database.js';

export type roles = 'member' | 'admin';

export const defaultRole: roles = 'member';