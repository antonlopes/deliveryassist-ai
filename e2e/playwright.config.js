import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'*.spec.js',timeout:35000,retries:0,use:{baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:5173',headless:true,viewport:{width:1280,height:800}},reporter:[['list'],['html',{open:'never'}]]});
