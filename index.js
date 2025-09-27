const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
    allowEIO3: true
});
const fs = require("fs");
const crypto = require('crypto');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');

// Global error handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Emit error to all connected clients
    io.emit('globalError', {
        message: `REPORT THIS TO JOEL OR THE OTHER OWNER! ${error.message}`,
        stack: error.stack
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Emit error to all connected clients
    io.emit('globalError', {
        message: `REPORT THIS TO JOEL OR THE OTHER OWNER! ${reason}`,
        stack: reason.stack || 'No stack trace available'
    });
});

// At the top after requires
const DEBUG = true;

function debug(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Utility functions
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function guidGen() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

//Read settings
var colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/g,"").split("\n").filter(Boolean);
var blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/g,"").split("\n");
var config = JSON.parse(fs.readFileSync("./config/config.json"));
if(blacklist.includes("")) blacklist = []; //If the blacklist has a blank line, ignore the whole list.

// Track banned names and name usage
const bannedNames = new Map(); // name -> unban timestamp
const nameUsage = new Map(); // name -> {count: number, users: Set<socket>}
const NAME_BAN_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Connection flood protection
const recentConnections = [];
const CONNECTION_FLOOD_WINDOW = 3000; // 3 seconds
const CONNECTION_FLOOD_THRESHOLD = 3; // Max connections in window
const CONNECTION_BAN_DURATION = 10 * 60 * 1000; // 10 minutes
const bannedIPs = new Map(); // IP -> unban timestamp

// Add to the top section with other constants
const KNOWN_MALICIOUS_PATTERNS = [
    /chuchel/i,
    /ddos/i,
    /raid/i,
    /bot/i,
    /hate.*bfdi/i
];

const BLOCKED_IMAGE_DOMAINS = [
    'cdn.discordapp.com',
    'media.discordapp.net',
    // Add more as needed
];

// Function to check for connection flooding
function isConnectionFlooding(ip) {
    const now = Date.now();
    
    // Clean up old connections
    while (recentConnections.length > 0 && now - recentConnections[0].time > CONNECTION_FLOOD_WINDOW) {
        recentConnections.shift();
    }
    
    // Count recent connections from this IP
    const recentFromIP = recentConnections.filter(conn => conn.ip === ip).length;
    
    // Add this connection
    recentConnections.push({ ip, time: now });
    
    // Check if threshold exceeded
    if (recentFromIP >= CONNECTION_FLOOD_THRESHOLD) {
        // Ban the IP
        bannedIPs.set(ip, now + CONNECTION_BAN_DURATION);
        return true;
    }
    
    return false;
}

// Function to check if an IP is banned
function isIPBanned(ip) {
    if (bannedIPs.has(ip)) {
        const unbanTime = bannedIPs.get(ip);
        if (Date.now() >= unbanTime) {
            // IP ban has expired
            bannedIPs.delete(ip);
            return false;
        }
        return true;
    }
    return false;
}

// Function to check if a name is currently banned
function isNameBanned(name) {
    // Only check explicit bans, no other restrictions
    if (bannedNames.has(name)) {
        const unbanTime = bannedNames.get(name);
        if (Date.now() >= unbanTime) {
            // Name ban has expired
            bannedNames.delete(name);
            return false;
        }
        return true;
    }
    return false;
}

// Function to ban a name and kick users
function banNameAndKickUsers(name, room) {
    // Simplified name banning
    bannedNames.set(name, Date.now() + NAME_BAN_DURATION);
    
    // Only kick users if room is provided
    if (room) {
        const usageInfo = nameUsage.get(name);
        if (usageInfo) {
            usageInfo.users.forEach(user => {
                user.socket.emit("kick", {reason: "Name banned"});
                user.socket.disconnect();
            });
            nameUsage.delete(name);
        }
    }
}

// Define privileged colors - these are not in the random selection pool
const PRIVILEGED_COLORS = ["pope", "king", "bless", "rabbi"];

// Add debug logging
console.log("Loaded colors:", colors);

//Variables
var rooms = {};
var userips = {}; //It's just for the alt limit
var guidcounter = 0;

// Authority levels
const KING_LEVEL = 1.1;
const HIGHER_KING_LEVEL = 1.5;
const ROOMOWNER_LEVEL = 1;
const BLESSED_LEVEL = 0.1;
const RABBI_LEVEL = 0.5;
const LOWER_RABBI_LEVEL = 0.3;
const POPE_LEVEL = 2;
const DEFAULT_LEVEL = 0;

// Registry of legitimate cookies granted by Higher Kings
const legitimateCookies = new Map();

// Add rate limiting and anti-bot detection
const messageRateLimits = new Map();
const commandRateLimits = new Map();
const connectionAttempts = new Map();

// Rate limit settings
const MESSAGE_LIMIT = 10; // Max messages per 2 seconds
const COMMAND_LIMIT = 5; // Max commands per 2 seconds
const CONNECTION_LIMIT = 5; // Max connections per 5 seconds
const RATE_WINDOW = 2000; // 2 second window
const CONNECTION_WINDOW = 5000; // 5 second window
const THROTTLE_DURATION = 5000; // 5 second throttle when limit exceeded

// Add this helper function near the top with other utility functions
function canKingAffectKing(sourceLevel, targetLevel) {
    // If either user is not a king, this function doesn't apply
    if (sourceLevel !== KING_LEVEL && sourceLevel !== HIGHER_KING_LEVEL) return true;
    if (targetLevel !== KING_LEVEL && targetLevel !== HIGHER_KING_LEVEL) return true;
    
    // Kings can't affect other kings
    return false;
}

// Enhanced bot detection with removed name checks
function isBot(socket, data) {
    if (!socket) return true;
    const ip = getRealIP(socket);
    if (!ip) return true;
    
    const now = Date.now();

    // Initialize rate limiters
    if (!messageRateLimits.has(ip)) {
        messageRateLimits.set(ip, {
            count: 0,
            lastReset: now,
            throttled: false
        });
    }
    if (!commandRateLimits.has(ip)) {
        commandRateLimits.set(ip, {
            count: 0,
            lastReset: now,
            throttled: false
        });
    }
    if (!connectionAttempts.has(ip)) {
        connectionAttempts.set(ip, {
            count: 0,
            lastReset: now,
            throttled: false
        });
    }

    // Initialize tracking if not exists
    if (!socket.userData) {
        socket.userData = {
            commandCount: 0,
            lastCommandReset: now,
            lastMessages: [],
            messagePatterns: new Set()
        };
    }

    // Check for known malicious patterns
    if (data) {
        const textToCheck = JSON.stringify(data).toLowerCase();
        for (const pattern of KNOWN_MALICIOUS_PATTERNS) {
            if (pattern.test(textToCheck)) {
                console.log(`[BOT] Detected malicious pattern: ${pattern}`);
                return true;
            }
        }
    }

    // Check for message patterns indicating bot behavior
    if (socket.userData.lastMessages.length >= 3) {
        const pattern = socket.userData.lastMessages.join('|');
        if (socket.userData.messagePatterns.has(pattern)) {
            console.log(`[BOT] Detected repetitive message pattern from IP: ${ip}`);
            return true;
        }
        socket.userData.messagePatterns.add(pattern);
    }

    return false;
}

// Serve static files from frontend directory
app.use(express.static('frontend'));

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/frontend/index.html');
});

// Text filtering function
function filtertext(tofilter) {
    var filtered = false;
    blacklist.forEach(listitem=>{
        if(tofilter.includes(listitem)) filtered = true;
    });
    return filtered;
}

// User class
class user {
    constructor(socket) {
        debug('New user connecting...', getRealIP(socket));
        this.socket = socket;
        this.ip = getRealIP(socket);
        
        // Initialize user properties
        this.room = null;
        this.guid = this.newGuid();
        debug('Generated new GUID:', this.guid);
        
        this.public = {
            guid: this.guid,
            color: this.getRandomColor(),
            name: "Anonymous",
            tag: null,
            tagged: false,
            typing: "",
            coins: 100,
            speaking: false,
            hasLock: false,
            hasBoltCutters: false,
            hasSelfDefenseGun: false,
            hasRingDoorbell: false,
            crosscolorsEnabled: true,
            voiceMuted: false
        };
        debug('Initial user color:', this.public.color);
        
        this.loggedin = false;
        this.level = DEFAULT_LEVEL;
        this.slowed = false;
        this.sanitize = true;
        this.muted = false;
        this.statlocked = false;
        this.public.voiceMuted = false;
        this.originalName = "";
        this.stealSuccessRate = 0.5;
        this.public.isHomeless = false;
        this.sanitizeEnabled = true;

        // Add login handler first
        this.socket.on("login", (logdata) => {
            debug('Login attempt:', logdata);
            if(typeof logdata !== "object" || typeof logdata.name !== "string" || typeof logdata.room !== "string") {
                debug('Invalid login data');
                return;
            }
            
            if (logdata.name == undefined || logdata.room == undefined) {
                debug('Using default login data');
                logdata = { room: "default", name: "Anonymous" };
            }
            
            if(this.loggedin) {
                debug('Login rejected - already logged in');
                return;
            }
            
            try {
                debug('Processing login for user:', this.guid);
                // Set up user data
                this.loggedin = true;
                
                // Check if name is banned
                if(isNameBanned(logdata.name)) {
                    this.socket.emit("kick", {reason: "This name is temporarily banned"});
                    this.socket.disconnect();
                    return;
                }
                
                this.public.name = logdata.name || "Anonymous";
                
                // Track name usage without flood protection
                if(!nameUsage.has(this.public.name)) {
                    nameUsage.set(this.public.name, {
                        count: 1,
                        users: new Set([this])
                    });
                } else {
                    const usage = nameUsage.get(this.public.name);
                    usage.count++;
                    usage.users.add(this);
                }
                
                // Check for rabbi cookie - simple expiry check
                if(logdata.rabbiExpiry) {
                    if(parseInt(logdata.rabbiExpiry) > Date.now()) {
                        this.level = 0.5;
                        this.public.color = "rabbi";
                        this.public.tagged = true;
                        this.public.tag = "Rabbi";
                        debug('User is a Rabbi');
                    }
                }
                
                // Check for Lower Rabbi (Hanukkah) cookie with authentication
                if(logdata.lowerRabbiExpiry) {
                    try {
                        // Verify the cookie format
                        const cookieValue = logdata.lowerRabbiExpiry;
                        
                        // Authentication check - verify cookie against registry
                        if(this.verifyLowerRabbiAuth(cookieValue)) {
                            // Set as Lower Rabbi (Hanukkah)
                            this.level = LOWER_RABBI_LEVEL;
                            this.public.color = "jew";
                            this.public.tagged = true;
                            this.public.tag = "Hanukkah";
                            debug('User authenticated as Lower Rabbi (Hanukkah)');
                        } else {
                            debug('Invalid Lower Rabbi authentication');
                            this.socket.emit("clearHanukkahCookie");
                        }
                    } catch(err) {
                        debug('Error processing Lower Rabbi cookie:', err);
                        this.socket.emit("clearHanukkahCookie");
                    }
                }
                
                // Handle room setup
                let roomname = logdata.room || "default";
                if(roomname == "") roomname = "default";
                debug('Joining room:', roomname);
                
                // Create room if it doesn't exist
                if(!rooms[roomname]) {
                    debug('Creating new room:', roomname);
                    rooms[roomname] = new room(roomname);
                    this.level = ROOMOWNER_LEVEL;  // Set to 1 for room owner
                    this.public.tagged = true;
                    this.public.tag = "Room Owner";
                    this.public.color = "king";
                }
                
                // Join room
                this.room = rooms[roomname];
                if(this.room) {
                    this.room.users.push(this);
                    this.room.usersPublic[this.public.guid] = this.public;
                    debug('Joined room:', roomname, 'users:', this.room.users.length);
                    
                    // Update room
                    this.socket.emit("updateAll", { usersPublic: this.room.usersPublic });
                    this.room.emit("update", { guid: this.public.guid, userPublic: this.public }, this);
                    this.room.updateMemberCount();
                }
                
                // Send room info
                this.socket.emit("room", {
                    room: roomname,
                    isOwner: this.level >= KING_LEVEL,
                    isPublic: roomname === "default"
                });
                
                // Send auth level
                this.socket.emit("authlv", {level: this.level});
                this.socket.emit("authlv2", {level: this.level});
                debug('Login successful for user:', this.guid);
                
            } catch(err) {
                console.error("Login error:", err);
                debug('Login error:', err);
                this.socket.emit("login_error", "Failed to join room");
                this.loggedin = false;
                this.room = null;
            }
        });

        // Set up other socket event handlers
        this.setupSocketHandlers();
        debug('User setup complete');
    }

    setupSocketHandlers() {
        debug('Setting up socket handlers for user:', this.guid);
        
        // Remove any existing handlers to prevent duplicates
        this.socket.removeAllListeners("command");
        this.socket.removeAllListeners("talking");
        this.socket.removeAllListeners("typing");
        this.socket.removeAllListeners("stealCoins");
        this.socket.removeAllListeners("gambleCoins");
        this.socket.removeAllListeners("work");
        this.socket.removeAllListeners("disconnect");
        debug('Removed old socket handlers');

        // Add typing indicator with room check and throttling
        this.lastTypingUpdate = 0;
        this.socket.on("typing", (data) => {
            if(!this.room || !this.loggedin) {
                debug('Typing event ignored - user not in room or not logged in');
                return;
            }
            if(typeof data !== "object") {
                debug('Invalid typing data received');
                return;
            }
            
            const now = Date.now();
            if (now - this.lastTypingUpdate < 500) {
                debug('Typing update throttled');
                return;
            }
            this.lastTypingUpdate = now;
            
            this.public.typing = data.state === 1 ? " (typing)" : data.state === 2 ? " (commanding)" : "";
            if(this.room) {
                debug('Emitting typing update for user:', this.guid);
                this.room.emitWithCrosscolorFilter("update", { guid: this.public.guid, userPublic: this.public }, this);
            }
        });

        // Add speaking status handler with room check
        this.socket.on("speaking", (speaking) => {
            if(!this.room || !this.loggedin) return;
            if(this.public.voiceMuted) return;
            
            if(speaking) {
                if(!this.public.speaking) {
                    this.originalName = this.public.name;
                    this.public.name += " (speaking)";
                }
            } else {
                if(this.public.speaking) {
                    this.public.name = this.originalName;
                }
            }
            
            this.public.speaking = speaking;
            if(this.room) {
                this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
            }
        });

        // Add voice chat handler with room check and user limit
        this.socket.on("voiceChat", (data) => {
            if (!data || !data.audio) return;
            if (!this.room || !this.room.users) return;
            
            // Check if this user is allowed to use voice chat
            if (this.room.activeVoiceUser && this.room.activeVoiceUser !== this.guid) {
                this.socket.emit("alert", "Someone else is already using voice chat");
                return;
            }
            
            // Set this user as the active voice chat user
            this.room.activeVoiceUser = this.guid;
            
            // Add speaking indicator
            if(!this.public.speaking) {
                this.originalName = this.public.name;
                this.public.name += " (speaking)";
                this.public.speaking = true;
                this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
            }
            
            // Broadcast voice to all users in room except sender
            this.room.users.forEach(user => {
                if (user !== this && user.socket && user.socket.connected) {
                    user.socket.emit("voiceChat", {
                        from: this.public.guid,
                        fromName: this.public.name,
                        audio: data.audio,
                        duration: data.duration || 3000
                    });
                }
            });
            
            // Remove speaking indicator and active voice user after audio duration
            setTimeout(() => {
                if(this.public.speaking) {
                    this.public.name = this.originalName;
                    this.public.speaking = false;
                    if(this.room) {
                        this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
                    }
                }
                if (this.room && this.room.activeVoiceUser === this.guid) {
                    this.room.activeVoiceUser = null;
                    this.room.emit("voiceStatus", { activeUser: null });
                }
            }, data.duration || 3000);
            
            // Notify all clients about active voice user
            this.room.emit("voiceStatus", { activeUser: this.guid });
        });
        
        // Handle user disconnect - clear active voice user if needed
        this.socket.on("disconnect", () => {
            if (this.room && this.room.activeVoiceUser === this.guid) {
                this.room.activeVoiceUser = null;
                this.room.emit("voiceStatus", { activeUser: null });
            }
        });

        // Add voice chat handler with room check
        this.socket.on("voice", (data) => {
            if(!this.room || !this.loggedin) return;
            if(this.public.voiceMuted) return;
            
            this.room.emit("voice", {
                guid: this.public.guid,
                data: data
            }, this);
        });

        // Handle disconnection with room cleanup
        this.socket.on("disconnect", () => {
            debug('User disconnecting:', this.guid);
            if(!this.loggedin || !this.room) {
                debug('Disconnect ignored - user not logged in or not in room');
                return;
            }
            
            try {
                // Clean up name usage tracking
                if(this.public.name && nameUsage.has(this.public.name)) {
                    const usage = nameUsage.get(this.public.name);
                    usage.count--;
                    usage.users.delete(this);
                    
                    // Remove tracking if no more users with this name
                    if(usage.count <= 0) {
                        nameUsage.delete(this.public.name);
                    }
                }
                
                if(this.room.usersPublic[this.public.guid]) {
                    delete this.room.usersPublic[this.public.guid];
                    debug('Removed user from room.usersPublic');
                }
                
                const userIndex = this.room.users.indexOf(this);
                if(userIndex > -1) {
                    this.room.users.splice(userIndex, 1);
                    debug('Removed user from room.users');
                }
                
                this.room.emit("leave", { guid: this.public.guid });
                this.room.updateMemberCount();
                debug('Room member count updated');
                
                if(this.room.isEmpty() && this.room.name !== "default") {
                    delete rooms[this.room.name];
                    debug('Empty room deleted:', this.room.name);
                }
            } catch(err) {
                console.error('Disconnect cleanup error:', err);
                debug('Error during disconnect cleanup:', err);
            }
        });

        //talk
        this.socket.on("talk", (msg) => {
            if(typeof msg !== "object" || typeof msg.text !== "string") return;
            if(this.muted) return;

            // Initialize rate limit if not exists
            if (!messageRateLimits.has(this.ip)) {
                messageRateLimits.set(this.ip, {
                    count: 0,
                    lastReset: Date.now(),
                    throttled: false
                });
            }

            // Rate limit messages
            const msgLimit = messageRateLimits.get(this.ip);
            msgLimit.count++;
            if (msgLimit.count > MESSAGE_LIMIT) {
                if (!msgLimit.throttled) {
                    msgLimit.throttled = true;
                    setTimeout(() => {
                        msgLimit.throttled = false;
                        msgLimit.count = 0;
                    }, THROTTLE_DURATION);
                }
                return;
            }

            // Remove text between [[ and ]] for TTS
            msg.text = msg.text.replace(/\[\[[\s\S]*?\]\]/g, '');

            // Check for character spam
            const SPAM_THRESHOLD = 15; // Maximum consecutive same character
            const OVERALL_LENGTH_LIMIT = 200; // Maximum overall message length
            
            // Trim the message to prevent extremely long messages
            msg.text = msg.text.slice(0, OVERALL_LENGTH_LIMIT);
            
            // Check for repetitive character spam
            const spamRegex = /(.)\1{14,}/g; // Matches 15 or more of the same character
            if(spamRegex.test(msg.text)) {
                // Either mute them temporarily or reduce the spam
                if(!this.spamWarnings) this.spamWarnings = 0;
                this.spamWarnings++;
                
                if(this.spamWarnings >= 3) {
                    // Mute them for 1 minute after 3 warnings
                    this.muted = true;
                    setTimeout(() => {
                        this.muted = false;
                        this.spamWarnings = 0;
                    }, 60000);
                    this.socket.emit("alert", "You have been muted for 1 minute due to spam.");
                    return;
                }
                
                // Replace spam with maximum allowed repetition
                msg.text = msg.text.replace(spamRegex, (match, char) => char.repeat(SPAM_THRESHOLD));
                this.socket.emit("alert", "Warning: Excessive character repetition detected.");
            }

            if(this.sanitize) msg.text = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if(filtertext(msg.text) && this.sanitize) msg.text = "###########";
            
            // Only send if there's actual content after filtering
            if(msg.text.trim()) {
                if(!this.slowed) {
                    this.room.emit("talk", { guid: this.public.guid, text: msg.text });
                    this.slowed = true;
                    setTimeout(()=>{
                        this.slowed = false;
                    }, config.slowmode);
                }
            }
        });

        // Add socket handler for votes
        this.socket.on("vote", (vote) => {
            if (this.room) {
                this.room.handleVote(this, vote);
            }
        });

        // Add statlock check to color command
        this.socket.on("useredit", data => {
            if(!data.id) return; // Must have target ID
            let target = this.room.users.find(u => u.public.guid == data.id);
            if(!target) return;
            
            // Check if target is statlocked
            if(target.statlocked) return;
            
            // Update color if provided
            if(data.color) {
                target.public.color = data.color;
            }
            
            // Update name if provided  
            if(data.name) {
                target.public.name = data.name;
            }
            
            // Emit update to room
            this.room.emit("update", {guid: target.public.guid, userPublic: target.public});
        });

        // COMMAND HANDLER
        this.socket.on("command", async (data) => {
            // Initialize command rate limit if not exists
            if (!commandRateLimits.has(this.ip)) {
                commandRateLimits.set(this.ip, {
                    count: 0,
                    lastReset: Date.now(),
                    throttled: false
                });
            }

            // Rate limit commands
            const cmdLimit = commandRateLimits.get(this.ip);
            cmdLimit.count++;
            if (cmdLimit.count > COMMAND_LIMIT) {
                if (!cmdLimit.throttled) {
                    cmdLimit.throttled = true;
                    setTimeout(() => {
                        cmdLimit.throttled = false;
                        cmdLimit.count = 0;
                    }, THROTTLE_DURATION);
                }
                return;
            }

            // Bot detection
            if (isBot(this.socket, data)) {
                if (!global.tempBans) global.tempBans = new Set();
                global.tempBans.add(this.ip);
                this.socket.emit("ban", {
                    reason: "Bot activity detected",
                    end: new Date(Date.now() + 24*60*60*1000).toISOString()
                });
                this.socket.disconnect();
                return;
            }

            debug('Received command:', data);
            if (typeof data !== "object") {
                debug('Invalid command data received');
                return;
            }
            
            let command = data.list[0];
            let args = data.list.slice(1);
            debug('Processing command:', command, 'with args:', args);

            // Validate command
            if (!validateCommand(this.socket, command, args.join(' '))) {
                this.socket.emit("alert", "Command rejected due to spam protection");
                return;
            }
            
            switch(command) {
                case "ban":
                    if (this.level < POPE_LEVEL) {
                        debug('Ban command rejected - insufficient permissions');
                        return;
                    }
                    let target = this.room.users.find(u => u.guid === args[0]);
                    if (!target) {
                        debug('Ban target not found:', args[0]);
                        return;
                    }
                    
                    if (!global.tempBans) global.tempBans = new Set();
                    global.tempBans.add(target.ip);
                    debug('Added IP to tempBans:', target.ip);
                    
                    target.socket.emit("ban", {
                        reason: "Banned by Pope until server restart",
                        end: new Date(Date.now() + 24*60*60*1000).toISOString()
                    });
                    target.socket.disconnect();
                    debug('User banned and disconnected:', target.guid);
                    break;
                    
                default:
                    let cmd = data.list[0];
                    if (!cmd || !commands[cmd]) {
                        debug('Invalid command or command not found:', cmd);
                        return;
                    }

                    let param = data.list.slice(1).join(" ");
                    debug('Processing command:', cmd, 'with param:', param);
                    
                    if(typeof param !== 'string') {
                        debug('Invalid parameter type');
                        return;
                    }
                    if(this.sanitize) param = param.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    if(filtertext(param) && this.sanitize) {
                        debug('Command filtered due to inappropriate content');
                        return;
                    }
                    
                    if(!this.slowed) {
                        debug('Executing command:', cmd);
                        commands[cmd](this, param);
                        this.slowed = true;
                        setTimeout(()=>{
                            this.slowed = false;
                            debug('Command slowmode reset for user:', this.guid);
                        }, config.slowmode);
                    } else {
                        debug('Command ignored due to slowmode');
                    }
            }
        });

        // Add coin handlers
        this.socket.on("stealCoins", (targetId) => {
            if (!this.room) return;
            
            const target = this.room.users.find(u => u.public.guid === targetId);
            if (!target) return;

            // Check if target has self defense gun
            if (target.public.hasSelfDefenseGun) {
                // Thief loses everything
                this.coins = -500;
                this.public.coins = this.coins;
                this.public.hasLock = false;
                this.public.hasRingDoorbell = false;
                this.public.hasSelfDefenseGun = false;
                this.public.hasVetoPower = false;
                this.public.hasBroom = false;
                this.public.tagged = true;
                this.public.tag = "homeless";
                
                // Lower steal success chance
                this.stealSuccessRate = 0.1; // 10% chance instead of normal
                
                // Disable work and gamble
                this.public.isHomeless = true;
                
                this.socket.emit("coinSteal", {
                    success: false,
                    reason: "selfdefense",
                    thief: this.public.name
                });
                
                // Update both users
                if(this.room) {
                    this.room.emit("update", {
                        guid: this.public.guid,
                        userPublic: this.public
                    });
                    this.room.emit("update", {
                        guid: target.public.guid,
                        userPublic: target.public
                    });
                }
                return;
            }
            
            // Check if target has a lock
            if(target.public.hasLock) {
                // Check if thief has bolt cutters
                if(this.public.hasBoltCutters) {
                    // Bolt cutters break the lock
                    target.public.hasLock = false;
                    this.public.hasBoltCutters = false; // Bolt cutters are consumed
                    
                    let stolenAmount = Math.floor(target.coins * 0.5);
                    target.coins -= stolenAmount;
                    this.coins += stolenAmount;
                    
                    target.public.coins = target.coins;
                    this.public.coins = this.coins;
                    
                    this.room.emit("update", {guid: target.public.guid, userPublic: target.public});
                    this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
                    
                    this.socket.emit("alert", `Used bolt cutters to break ${target.public.name}'s lock and stole ${stolenAmount} coins!`);
                    target.socket.emit("alert", `${this.public.name} used bolt cutters to break your lock and stole ${stolenAmount} coins!`);
                    return;
                } else {
                    // Lock protects the target
                    this.socket.emit("alert", `${target.public.name}'s lock protected them from theft!`);
                    
                    // Ring Doorbell gives extra info
                    if (target.public.hasRingDoorbell) {
                        target.socket.emit("alert", `${this.public.name} (${this.coins} coins) tried to steal from you but your lock protected you! [Ring Doorbell Alert]`);
                    } else {
                        target.socket.emit("alert", `${this.public.name} tried to steal from you but your lock protected you!`);
                    }
                    return;
                }
            }

            // Normal steal attempt (no lock or lock was broken)
            // 50% chance of success
            if(Math.random() < this.stealSuccessRate) {
                // Success - steal 50% of their coins
                let stolenAmount = Math.floor(target.coins * 0.5);
                target.coins -= stolenAmount;
                this.coins += stolenAmount;
                
                // Update both users' public coin amounts
                target.public.coins = target.coins;
                this.public.coins = this.coins;
                
                this.room.emit("update", {guid: target.public.guid, userPublic: target.public});
                this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
                
                this.socket.emit("alert", `Successfully stole ${stolenAmount} coins from ${target.public.name}!`);
                target.socket.emit("alert", `${this.public.name} stole ${stolenAmount} coins from you!`);
            } else {
                // Fail - get tagged, turned into jew, and lose 20 coins
                this.public.color = "jew";
                this.public.tagged = true;
                this.public.tag = "STEAL FAIL";
                
                // Penalty: lose 20 coins
                const penalty = Math.min(this.coins, 20);
                this.coins -= penalty;
                this.public.coins = this.coins;
                
                this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
                this.socket.emit("alert", `Steal failed! You've been caught and lost ${penalty} coins!`);
                
                // Ring Doorbell gives extra info to victim
                if (target.public.hasRingDoorbell) {
                    target.socket.emit("alert", `${this.public.name} (${this.coins} coins) tried to steal from you but failed! They lost ${penalty} coins as penalty. [Ring Doorbell Alert]`);
                } else {
                    target.socket.emit("alert", `${this.public.name} tried to steal from you but failed!`);
                }
            }
        });

        this.socket.on("gambleCoins", (amount) => {
            if (this.public.isHomeless) {
                this.socket.emit("alert", "You are homeless and cannot gamble!");
                return;
            }
            amount = parseInt(amount);
            if(isNaN(amount) || amount <= 0 || amount > this.coins) {
                this.socket.emit("alert", "Invalid gambling amount!");
                return;
            }

            // 45% chance to win (house edge)
            if(Math.random() < 0.45) {
                this.coins += amount;
                this.socket.emit("alert", `You won ${amount} coins!`);
            } else {
                this.coins -= amount;
                this.socket.emit("alert", `You lost ${amount} coins!`);
            }
            
            this.public.coins = this.coins;
            this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
        });

        this.socket.on("work", () => {
            if (this.public.isHomeless) {
                this.socket.emit("alert", "You are homeless and cannot work!");
                return;
            }
            const now = Date.now();
            const cooldown = 5 * 60 * 1000; // 5 minutes
            
            if(now - this.lastWork < cooldown) {
                this.socket.emit("alert", `You must wait ${Math.ceil((cooldown - (now - this.lastWork)) / 1000)} seconds before working again!`);
                return;
            }

            const earnedCoins = Math.floor(Math.random() * 30) + 20; // 20-50 coins
            this.coins += earnedCoins;
            this.public.coins = this.coins;
            this.lastWork = now;
            
            this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
            this.socket.emit("alert", `You earned ${earnedCoins} coins from working!`);
        });

        // Shop system
        this.socket.on("getShop", () => {
            const shopItems = [
                { id: "lock", name: "Lock", price: 25, description: "Prevents coin theft" },
                { id: "boltcutters", name: "Bolt Cutters", price: 75, description: "Cut through locks" },
                { id: "ringdoorbell", name: "Ring Doorbell", price: 150, description: "Know who tries to steal from you" },
                { id: "vetopower", name: "Veto Power", price: 200, description: "Jewify others + set your own coins (1-200)" },
                { id: "broom", name: "Magical Broom", price: 999, description: "I bought a broom tag + Endgame CMDs" },
                { id: "selfdefensegun", name: "Self Defense Gun", price: 300, description: "Defend against thieves" }
            ];
            
            this.socket.emit("shopMenu", {
                balance: this.coins,
                items: shopItems
            });
        });

        this.socket.on("buyItem", (itemId) => {
            console.log(`[BUY] User ${this.public.name} (${this.guid}) attempting to buy: ${itemId}`);
            console.log(`[BUY] User has ${this.coins} coins`);
            
            if(!itemId || typeof itemId !== "string") {
                this.socket.emit("alert", "Invalid item ID");
                return;
            }

            let item, price;
            switch(itemId) {
                case "lock":
                    item = "Lock";
                    price = 25;
                    break;
                case "boltcutters":
                    item = "Bolt Cutters";
                    price = 75;
                    break;
                case "ringdoorbell":
                    item = "Ring Doorbell";
                    price = 150;
                    break;
                case "vetopower":
                    item = "Veto Power";
                    price = 200;
                    break;
                case "broom":
                    item = "Magical Broom";
                    price = 999;
                    break;
                case "selfdefensegun":
                    if (this.coins < 300) {
                        this.socket.emit("purchaseFailed", { reason: "Not enough coins" });
                        return;
                    }
                    
                    this.coins -= 300;
                    this.public.coins = this.coins;
                    this.public.hasSelfDefenseGun = true;
                    
                    this.socket.emit("purchaseSuccess", { 
                        item: "Self Defense Gun",
                        message: "You can now defend against thieves!"
                    });
                    
                    if(this.room) {
                        this.room.emit("update", {
                            guid: this.public.guid,
                            userPublic: this.public
                        });
                    }
                    return;
                default:
                    console.log(`[BUY] Unknown item: ${itemId}`);
                    this.socket.emit("alert", "Item not found");
                    return;
            }

            console.log(`[BUY] Item: ${item}, Price: ${price}, User coins: ${this.coins}`);

            // Check if user has enough coins
            if(this.coins < price) {
                console.log(`[BUY] Insufficient coins: need ${price}, have ${this.coins}`);
                this.socket.emit("alert", `You need ${price} coins but only have ${this.coins} coins!`);
                return;
            }

            // User has enough coins - proceed with purchase
            console.log(`[BUY] Purchase approved! Deducting ${price} coins`);
            this.coins -= price;
            this.public.coins = this.coins;

            // Apply item effects
            let message = "";
            switch(itemId) {
                case "lock":
                    this.public.hasLock = true;
                    message = "You are now protected from theft!";
                    break;
                case "boltcutters":
                    this.public.hasBoltCutters = true;
                    message = "You can now cut through locks!";
                    break;
                case "ringdoorbell":
                    this.public.hasRingDoorbell = true;
                    message = "You can now see who tries to steal from you!";
                    break;
                case "vetopower":
                    this.public.hasVetoPower = true;
                    this.public.tag = "VETO POWER";
                    this.public.tagged = true;
                    message = "You now have Veto Power! You can jewify others and set your own coins (1-200)!";
                    break;
                case "broom":
                    this.public.hasBroom = true;
                    this.public.tag = "I bought a broom";
                    this.public.tagged = true;
                    message = "You now have the broom tag and Endgame CMDs!";
                    break;
            }

            // Update user data and notify success
            console.log(`[BUY] Purchase complete! User now has ${this.coins} coins`);
            this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
            this.socket.emit("alert", `Successfully purchased ${item}! ${message}`);
        });

        // Search system - risky adventure
        this.socket.on("search", (location) => {
            if(!location || typeof location !== "string" || location.length > 100) {
                this.socket.emit("alert", "Invalid search location!");
                return;
            }

            // Random outcomes with different probabilities
            const outcomes = [
                // Good outcomes (30%)
                { type: "coins", amount: 50, chance: 0.10, message: `You found a treasure chest in the ${location} and gained 50 coins!` },
                { type: "coins", amount: 100, chance: 0.05, message: `You discovered a hidden vault in the ${location} and found 100 coins!` },
                { type: "coins", amount: 25, chance: 0.15, message: `You found some loose change in the ${location} and gained 25 coins!` },
                
                // Neutral outcomes (20%)
                { type: "nothing", chance: 0.20, message: `You searched the ${location} thoroughly but found nothing of value.` },
                
                // Bad outcomes (50%)
                { type: "lose_coins", amount: 30, chance: 0.15, message: `You got mugged while exploring the ${location} and lost 30 coins!` },
                { type: "lose_coins", amount: 50, chance: 0.10, message: `You fell into a trap in the ${location} and lost 50 coins!` },
                { type: "lose_coins", amount: 20, chance: 0.15, message: `You had to pay a bribe to escape the ${location} and lost 20 coins!` },
                { type: "identity_loss", chance: 0.10, message: `You got lost in the ${location} and lost your identity! All coins and items gone!` }
            ];

            // Pick random outcome based on chances
            let random = Math.random();
            let cumulative = 0;
            let selectedOutcome = null;

            for(let outcome of outcomes) {
                cumulative += outcome.chance;
                if(random <= cumulative) {
                    selectedOutcome = outcome;
                    break;
                }
            }

            // Apply the outcome
            switch(selectedOutcome.type) {
                case "coins":
                    this.coins += selectedOutcome.amount;
                    this.public.coins = this.coins;
                    this.socket.emit("alert", selectedOutcome.message);
                    break;
                    
                case "lose_coins":
                    const lostAmount = Math.min(this.coins, selectedOutcome.amount);
                    this.coins -= lostAmount;
                    this.public.coins = this.coins;
                    this.socket.emit("alert", selectedOutcome.message.replace(selectedOutcome.amount, lostAmount));
                    break;
                    
                case "identity_loss":
                    // Reset everything - lose identity
                    this.coins = 0;
                    this.public.coins = 0;
                    this.public.hasLock = false;
                    this.public.hasBoltCutters = false;
                    this.public.hasBroom = false;
                    this.public.tag = "LOST SOUL";
                    this.public.tagged = true;
                    this.public.color = "black";
                    this.socket.emit("alert", selectedOutcome.message);
                    break;
                    
                case "nothing":
                default:
                    this.socket.emit("alert", selectedOutcome.message);
                    break;
            }

            // Update user data
            this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
        });

        // Donate coins
        this.socket.on("donateCoins", (data) => {
            if(!data || !data.target || !data.amount) {
                this.socket.emit("alert", "Invalid donation data!");
                return;
            }

            let amount = parseInt(data.amount);
            if(isNaN(amount) || amount <= 0 || amount > this.coins) {
                this.socket.emit("alert", "Invalid donation amount!");
                return;
            }

            let target = this.room.users.find(u => u.public.guid === data.target);
            if(!target) {
                this.socket.emit("alert", "Target user not found!");
                return;
            }

            if(target.guid === this.guid) {
                this.socket.emit("alert", "You can't donate to yourself!");
                return;
            }

            // Transfer coins
            this.coins -= amount;
            target.coins += amount;
            
            this.public.coins = this.coins;
            target.public.coins = target.coins;
            
            this.room.emit("update", {guid: this.public.guid, userPublic: this.public});
            this.room.emit("update", {guid: target.public.guid, userPublic: target.public});
            
            this.socket.emit("alert", `You donated ${amount} coins to ${target.public.name}!`);
            target.socket.emit("alert", `${this.public.name} donated ${amount} coins to you!`);
        });
        
        debug('Socket handlers setup complete for user:', this.guid);
    }

    getRandomColor() {
        const availableColors = colors.filter(color => !PRIVILEGED_COLORS.includes(color));
        const selectedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        debug('Generated random color:', selectedColor, 'from available colors:', availableColors);
        return selectedColor;
    }

    newGuid() {
        this.guid = guidGen();
        return this.guid;
    }
    
    // Verify Lower Rabbi authentication
    verifyLowerRabbiAuth(cookieValue, dummy) {
        try {
            // New cookie format is userIdentifier:timestamp:authKey or userIdentifier:forever
            if (!cookieValue || !cookieValue.includes(':')) {
                debug('Invalid cookie format');
                return false;
            }
            
            // Extract user identifier
            const parts = cookieValue.split(':');
            const userIdentifier = parts[0];
            
            // Generate the expected identifier for this user
            const expectedIdentifier = hashPassword(this.public.name + ":" + getRealIP(this.socket)).substring(0, 16);
            
            // Verify that the identifier matches this user
            if (userIdentifier !== expectedIdentifier) {
                debug('Cookie identifier mismatch');
                return false;
            }
            
            // Check if this identifier has a legitimate cookie in the registry
            const registeredCookie = legitimateCookies.get(userIdentifier);
            
            // If no registered cookie exists, authentication fails
            if (!registeredCookie) {
                debug('No registered cookie found for identifier:', userIdentifier);
                return false;
            }
            
            // Handle forever cookie
            if (parts.length === 2 && parts[1] === "forever" && registeredCookie === "forever") {
                return true;
            }
            
            // Handle timed cookie
            if (parts.length === 3 && registeredCookie.includes(':')) {
                const timestamp = parts[1];
                const authKey = parts[2];
                const [regTimestamp, regAuthKey] = registeredCookie.split(':');
                
                // Verify that the provided cookie matches the registered one
                if (timestamp === regTimestamp && authKey === regAuthKey) {
                    // Parse timestamp
                    const ts = parseInt(timestamp);
                    if(isNaN(ts)) return false;
                    
                    // Check if expired
                    if(ts <= Date.now()) {
                        // Remove expired cookie from registry
                        legitimateCookies.delete(userIdentifier);
                        return false;
                    }
                    
                    return true;
                }
            }
            
            return false;
        } catch(err) {
            debug('Error verifying Lower Rabbi auth:', err);
            return false;
        }
    }

    // ... rest of the class methods ...
}

// Room class with error handling
class room {
    constructor(name) {
        this.name = name;
        this.users = [];
        this.usersPublic = {};
        
        // Add poll tracking
        this.poll = {
            active: false,
            name: "",
            yes: 0,
            no: 0,
            voted: new Set()
        };
        this.activeVoiceUser = null; // Track active voice chat user
    }

    emit(event, data) {
        this.users.forEach((user) => {
            user.socket.emit(event, data);
        });
    }

    emitWithCrosscolorFilter(event, msg, targetUser) {
        if(!this.users) return;
        
        try {
            this.users.forEach((user) => {
                if(user && user.socket && user !== targetUser) {
                    let filteredMsg = { ...msg };
                    
                    // If this is an update event and the target has a crosscolor
                    if (event === "update" && targetUser && targetUser.public.realColor && targetUser.public.realColor.startsWith('http')) {
                        // Check if the receiving user has crosscolors disabled
                        if (!user.public.crosscolorsEnabled) {
                            // Hide the crosscolor from users who disabled them
                            filteredMsg = { ...msg };
                            filteredMsg.userPublic = { ...msg.userPublic };
                            filteredMsg.userPublic.color = "purple"; // Default color for users with crosscolors disabled
                        }
                    }
                    
                    user.socket.emit(event, filteredMsg);
                }
            });
            
            // Send the real color to the target user themselves
            if(targetUser && targetUser.socket) {
                targetUser.socket.emit(event, msg);
            }
        } catch(err) {
            console.error("Room emitWithCrosscolorFilter error:", err);
        }
    }

    updateMemberCount() {
        if(!this.users) return;
        this.emit("serverdata", { count: this.users.length });
    }

    isEmpty() {
        return !this.users || this.users.length === 0;
    }

    // Add method to handle votes
    handleVote(user, vote) {
        if (!this.poll.active || this.poll.voted.has(user.public.guid)) {
            return;
        }

        this.poll.voted.add(user.public.guid);
        if (vote) {
            this.poll.yes++;
        } else {
            this.poll.no++;
        }

        const total = this.poll.yes + this.poll.no;
        this.emit("pollupdate", {
            yes: (this.poll.yes / total) * 100,
            no: (this.poll.no / total) * 100,
            votecount: total
        });
    }

    // Add method to end poll
    endPoll() {
        this.poll = {
            active: false,
            name: "",
            yes: 0,
            no: 0,
            voted: new Set()
        };
    }
}

// Function to get real IP address - prioritize x-real-ip
function getRealIP(socket) {
    return socket.handshake.headers['x-real-ip'] || 
           socket.handshake.headers['x-forwarded-for'] || 
           socket.request.connection.remoteAddress;
}

// Add before io.on('connection')
io.use((socket, next) => {
    const ip = getRealIP(socket);
    
    // Check if IP is banned
    if (isIPBanned(ip)) {
        return next(new Error('IP temporarily banned for flooding'));
    }
    
    // Check for connection flooding
    if (isConnectionFlooding(ip)) {
        return next(new Error('Too many connections too quickly'));
    }
    
    // Silently drop connection if throttled
    const connLimit = connectionAttempts.get(ip);
    if (connLimit && connLimit.throttled) {
        return next(new Error());
    }

    // Bot detection on connection
    if (isBot(socket, socket.handshake.query)) {
        if (!global.tempBans) global.tempBans = new Set();
        global.tempBans.add(ip);
        return next(new Error('Bot detected'));
    }

    next();
});

//Socket.IO connection handling
io.on('connection', (socket) => {
    // Check for temporary bans using real IP
    const ip = getRealIP(socket);
    if(global.tempBans && global.tempBans.has(ip)) {
        socket.emit("ban", {
            reason: "Banned by Pope until server restart",
            end: new Date(Date.now() + 24*60*60*1000).toISOString()
        });
        socket.disconnect();
        return;
    }

    //First, verify this user fits the alt limit
    if(typeof userips[ip] == 'undefined') userips[ip] = 0;
    userips[ip]++;
    
    if(userips[ip] > config.altlimit){
        //If we have more than the altlimit, don't accept this connection and decrement the counter.
        userips[ip]--;
        socket.disconnect();
        return;
    }
    
    //Set up a new user on connection
    new user(socket);
});

//Command list
var commands = {
    name:(victim,param)=>{
        if (param == "" || param.length > config.namelimit) return;
        if(victim.statlocked) return; // Prevent if statlocked
        victim.public.name = param;
        if(victim.room) victim.room.emitWithCrosscolorFilter("update",{guid:victim.public.guid,userPublic:victim.public}, victim);
    },
    
    asshole:(victim,param)=>{
        if(victim.room) {
            victim.room.emit("asshole",{
                guid:victim.public.guid,
                target:param,
            });
        }
    },
    
    color:(victim, param)=>{
        debug('Color command received for user:', victim.guid, 'param:', param);
        
        if(victim.statlocked) {
            debug('Color change rejected - user is statlocked');
            return;
        }
        
        if(param.startsWith('http')) {
            const url = new URL(param);
            if(!config.whitelisted_image_hosts.includes(url.hostname)) {
                debug('Invalid image host, falling back to random color');
                param = colors[Math.floor(Math.random() * colors.length)];
            }
        } else if(!colors.some(color => color.toLowerCase() === param.toLowerCase())) {
            debug('Invalid color requested:', param, 'falling back to random color');
            param = colors[Math.floor(Math.random() * colors.length)];
        }
        
        debug('Setting color for user', victim.guid, 'to:', param);
        victim.public.color = param;
        victim.public.realColor = param;
        
        if(victim.room) {
            debug('Emitting color update to room');
            victim.room.emitWithCrosscolorFilter("update", {guid:victim.public.guid, userPublic:victim.public}, victim);
        }
    },
    
    pitch:(victim, param)=>{
        param = parseInt(param);
        if(isNaN(param)) return;
        victim.public.pitch = param;
        if(victim.room) victim.room.emitWithCrosscolorFilter("update",{guid:victim.public.guid,userPublic:victim.public}, victim);
    },

    speed:(victim, param)=>{
        param = parseInt(param);
        if(isNaN(param) || param>400) return;
        victim.public.speed = param;
        if(victim.room) victim.room.emitWithCrosscolorFilter("update",{guid:victim.public.guid,userPublic:victim.public}, victim);
    },
    
    godmode:(victim, param)=>{
        if(hashPassword(param) === config.godword) {
            victim.level = 2;
            victim.socket.emit("authlv", {level: victim.level});
        }
    },

    kingmode:(victim, param)=>{
        if(!param) return;
        const hash = hashPassword(param);
        if(hash === config.kingword) {
            victim.level = KING_LEVEL;
            victim.socket.emit("authlv", {level: victim.level});
            victim.public.color = "king";
            victim.public.tagged = true;
            victim.public.tag = "King";
            if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
        } else if(hash === config.higher_kingword) {
            victim.level = HIGHER_KING_LEVEL;
            victim.socket.emit("authlv", {level: victim.level});
            victim.public.color = "king";
            victim.public.tagged = true;
            victim.public.tag = "Operator/Admin";
            if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
        }
    },

    pope:(victim, param)=>{
        if(victim.level < 2) return; // Must be Pope
        victim.public.color = "pope";
        victim.public.tagged = true;
        victim.public.tag = "Pope/Owner";
        if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
    },

    king:(victim, param)=>{
        if(victim.level < ROOMOWNER_LEVEL) return; // Must be Room Owner or higher
        victim.public.color = "king";
        victim.public.tagged = true;
        victim.public.tag = "King";
        if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
    },

    hail:(victim, param)=>{
        if(victim.room) {
            victim.room.emit("hail", {
                guid: victim.public.guid,
                user: param
            });
        }
    },

    youtube:(victim, param)=>{
        if(victim.room) victim.room.emit("youtube", {
            guid: victim.public.guid,
            vid: param.replace(/"/g, "&quot;")
        });
    },

    joke:(victim, param)=>{
        if(victim.room) victim.room.emit("joke", {guid:victim.public.guid, rng:Math.random()});
    },
    
    fact:(victim, param)=>{
        if(victim.room) victim.room.emit("fact", {guid:victim.public.guid, rng:Math.random()});
    },
    
    backflip:(victim, param)=>{
        if(victim.room) victim.room.emit("backflip", {guid:victim.public.guid, swag:(param.toLowerCase() == "swag")});
    },
    
    owo:(victim, param)=>{
        if(victim.room) victim.room.emit("owo",{
            guid:victim.public.guid,
            target:param,
        });
    },

    triggered:(victim, param)=>{
        if(victim.room) victim.room.emit("triggered", {guid:victim.public.guid});
    },

    linux:(victim, param)=>{
        if(victim.room) victim.room.emit("linux", {guid:victim.public.guid});
    },

    background:(victim, param)=>{
        if(victim.level >= KING_LEVEL) {
            // Privileged users (King or higher) change background for everyone
            if(victim.room) victim.room.emit("background", {bg:param});
        } else {
            // Unprivileged users only change background for themselves
            victim.socket.emit("background", {bg:param});
        }
    },

    // Endgame commands for broom owners and veto power holders
    jewify:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL && !victim.public.hasBroom && !victim.public.hasVetoPower) return; // Must be Lower Rabbi or higher or have special permissions
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        target.public.color = "jew";
        target.public.tagged = true;
        target.public.tag = "Jew";
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    bless:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL) return; // Must be Lower Rabbi or higher
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }

        // Don't downgrade higher level users
        if(target.level >= KING_LEVEL) return;
        
        // Don't change level if blessing yourself as a Lower Rabbi
        if(target.guid === victim.guid && victim.level === LOWER_RABBI_LEVEL) {
            target.public.tagged = true;
            target.public.tag = "Blessed";
            target.public.color = "bless";
            if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
            return;
        }
        
        target.level = BLESSED_LEVEL;  // Set to 0.1 for blessed
        target.public.tagged = true;
        target.public.tag = "Blessed/Trusted";
        target.public.color = "bless";
        target.socket.emit("authlv", {level: target.level});
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    // mycoins:(victim, param)=>{
    //     if(!victim.public.hasVetoPower) return; // Must have veto power
        
    //     let amount = parseInt(param);
    //     if(isNaN(amount) || amount < 1 || amount > 200) {
    //         victim.socket.emit("alert", "You can only set your coins between 1 and 200!");
    //         return;
    //     }
        
    //     victim.coins = amount;
    //     victim.public.coins = amount;
    //     if(victim.room) victim.room.emitWithCrosscolorFilter("update", {guid: victim.public.guid, userPublic: victim.public}, victim);
    //     victim.socket.emit("alert", `Set your coins to ${amount}`);
    // },

    // setcoins:(victim, param)=>{
    //     if(!victim.public.hasBroom) return; // Must have broom
    //     let [targetId, amount] = param.split(" ");
    //     if(!victim.room) return;
    //     let target = victim.room.users.find(u => u.public.guid == targetId);
    //     if(!target) return;
        
    //     amount = parseInt(amount);
    //     if(isNaN(amount) || amount < 0) return;
        
    //     target.coins = amount;
    //     target.public.coins = amount;
    //     if(victim.room) victim.room.emitWithCrosscolorFilter("update", {guid: target.public.guid, userPublic: target.public}, target);
    //     victim.socket.emit("alert", `Set ${target.public.name}'s coins to ${amount}`);
    // },

    // givecoins:(victim, param)=>{
    //     if(victim.level < 2) return; // Must be Pope
        
    //     let parts = param.split(" ");
    //     if(parts.length < 2) {
    //         victim.socket.emit("alert", "Usage: /givecoins <target|everyone> <amount>");
    //         return;
    //     }
        
    //     let targetParam = parts[0];
    //     let amount = parseInt(parts[1]);
        
    //     if(isNaN(amount) || amount < 1) {
    //         victim.socket.emit("alert", "Amount must be a positive number!");
    //         return;
    //     }
        
    //     if(targetParam.toLowerCase() === "everyone") {
    //         // Give coins to everyone in the room
    //         if(victim.room) {
    //             victim.room.users.forEach(user => {
    //                 user.coins += amount;
    //                 user.public.coins = user.coins;
    //                 victim.room.emit("update", {guid: user.public.guid, userPublic: user.public});
    //             });
    //             victim.room.emit("talk", {
    //                 guid: victim.public.guid,
    //                 text: `${victim.public.name} gave ${amount} coins to everyone!`
    //             });
    //         }
    //     } else {
    //         // Give coins to specific target
    //         if(!victim.room) return;
    //         let target = victim.room.users.find(u => u.public.guid == targetParam || u.public.name.toLowerCase() == targetParam.toLowerCase());
    //         if(!target) {
    //             victim.socket.emit("alert", "Target user not found!");
    //             return;
    //         }
            
    //         target.coins += amount;
    //         target.public.coins = target.coins;
    //         victim.room.emit("update", {guid: target.public.guid, userPublic: target.public});
    //         victim.socket.emit("alert", `Gave ${amount} coins to ${target.public.name}!`);
    //         target.socket.emit("alert", `${victim.public.name} gave you ${amount} coins!`);
    //     }
    // },

    toggle:(victim, param)=>{
        victim.public.crosscolorsEnabled = !victim.public.crosscolorsEnabled;
        victim.socket.emit("alert", `Crosscolors ${victim.public.crosscolorsEnabled ? 'enabled' : 'disabled'}`);
        
        // Refresh all users to apply the toggle
        if(victim.room) {
            victim.room.users.forEach(user => {
                victim.room.emitWithCrosscolorFilter("update", {guid: user.public.guid, userPublic: user.public}, user);
            });
        }
    },

    dm:(victim, param)=>{
        if(!victim.room) return;
        
        // The frontend sends {msg, guid} format
        if(typeof param !== "object") {
            try {
                param = JSON.parse(param);
            } catch(e) {
                return;
            }
        }

        if(!param.msg || !param.guid) return;

        // Find target user by guid
        const target = victim.room.users.find(u => u.public.guid === param.guid);
        if(!target) {
            victim.socket.emit("alert", "User not found");
            return;
        }

        // Send DM only to sender and recipient
        target.socket.emit("dm", {
            from: victim.public.guid,
            fromName: victim.public.name,
            msg: param.msg,
            isPrivate: true
        });
        
        // Confirm to sender
        victim.socket.emit("dm", {
            from: victim.public.guid,
            fromName: `To ${target.public.name}`,
            msg: param.msg,
            isPrivate: true
        });
    },

    quote:(victim, param)=>{
        if(!victim.room) return;
        
        // The frontend sends {msg, guid} format
        if(typeof param !== "object") {
            try {
                param = JSON.parse(param);
            } catch(e) {
                return;
            }
        }

        if(!param.msg || !param.guid) return;

        // Find target user by guid for reference
        const target = victim.room.users.find(u => u.public.guid === param.guid);
        if(!target) {
            victim.socket.emit("alert", "User not found");
            return;
        }

        const now = Date.now();
        
        // Initialize userData if not exists
        if (!victim.socket.userData) {
            victim.socket.userData = {
                quoteCount: 0,
                lastQuoteReset: now
            };
        }
        
        // Reset quote counter every 10 seconds
        if (now - victim.socket.userData.lastQuoteReset > 10000) {
            victim.socket.userData.quoteCount = 0;
            victim.socket.userData.lastQuoteReset = now;
        }
        
        // Increment quote counter
        victim.socket.userData.quoteCount++;
        
        // Check for quote spam
        if (victim.socket.userData.quoteCount > 10) {
            victim.socket.emit("alert", "Quote rejected due to spam protection");
            return;
        }
        
        // Check for malicious patterns in quote
        if (KNOWN_MALICIOUS_PATTERNS.some(pattern => pattern.test(param.msg))) {
            victim.socket.emit("alert", "Quote rejected due to malicious content");
            return;
        }

        // Send quote to all users in the room
        victim.room.emit("quote", {
            from: victim.public.guid,
            fromName: victim.public.name,
            msg: param.msg,
            quotedUser: target.public.name
        });
    },

    rabbify:(victim, param)=>{
        if(victim.level < POPE_LEVEL) return; // Must be Pope
        let [targetId, duration] = param.split(" ");
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == targetId);
        if(!target) return;
        duration = parseInt(duration);
        if(isNaN(duration)) return;
        
        target.level = RABBI_LEVEL; // Set to 0.5 for Rabbi
        target.public.color = "rabbi";
        target.public.tagged = true;
        target.public.tag = "Rabbi";

        // Set rabbi cookie with just expiry timestamp
        const expiry = Date.now() + (duration * 60 * 1000);
        target.socket.emit("setRabbiCookie", {
            expiry: expiry,
            duration: duration * 60
        });

        target.socket.emit("authlv", {level: target.level});
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
        target.socket.emit("rabbi", duration * 60);

        // Set timeout to remove rabbi status
        setTimeout(() => {
            if(target.socket.connected) {
                target.level = 0;
                target.public.color = colors[Math.floor(Math.random()*colors.length)];
                target.public.tagged = false;
                target.public.tag = "";
                target.socket.emit("authlv", {level: target.level});
                target.socket.emit("authlv2", {level: target.level});
                target.socket.emit("clearHanukkahCookie");
                
                // Remove from legitimate cookies registry
                legitimateCookies.delete(target.public.guid);
                
                if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
            }
        }, duration * 60 * 1000);
    },

    rabbi:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL) return; // Must be Lower Rabbi or higher
        victim.public.color = "rabbi";
        
        // Set appropriate tag based on authority level
        if (victim.level === LOWER_RABBI_LEVEL) {
            victim.public.tag = "Hanukkah";
        } else if (victim.level >= RABBI_LEVEL) {
            victim.public.tag = "Rabbi";
        }
        
        victim.public.tagged = true;
        if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
    },

    tag:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL) return; // Must be Lower Rabbi or higher
        victim.public.tag = param;
        victim.public.tagged = true;
        if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
    },

    settag:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL) return; // Must be Lower Rabbi or higher
        victim.public.tag = param;
        victim.public.tagged = true;
        if(victim.room) victim.room.emit("update", {guid:victim.public.guid, userPublic:victim.public});
    },

    tagsom:(victim, param)=>{
        if(victim.level < 2) return; // Must be Pope
        let [targetId, tag] = param.split(" ");
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == targetId);
        if(!target) return;
        target.public.tag = tag;
        target.public.tagged = true;
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    bless:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL) return; // Must be Lower Rabbi or higher
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }

        // Don't downgrade higher level users
        if(target.level >= KING_LEVEL) return;
        
        // Don't change level if blessing yourself as a Lower Rabbi
        if(target.guid === victim.guid && victim.level === LOWER_RABBI_LEVEL) {
            target.public.tagged = true;
            target.public.tag = "Blessed";
            target.public.color = "bless";
            if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
            return;
        }
        
        target.level = BLESSED_LEVEL;  // Set to 0.1 for blessed
        target.public.tagged = true;
        target.public.tag = "Blessed";
        target.public.color = "bless";
        target.socket.emit("authlv", {level: target.level});
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    jewify:(victim, param)=>{
        if(victim.level < LOWER_RABBI_LEVEL && !victim.public.hasBroom && !victim.public.hasVetoPower) return; // Must be Lower Rabbi or higher or have special permissions
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        target.public.color = "jew";
        target.public.tagged = true;
        target.public.tag = "Jew";
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    statcustom:(victim, param)=>{
        if(victim.level < KING_LEVEL) return; // Must be King or higher
        let [targetId, name, color] = param.split(" ");
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == targetId);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        if(name) target.public.name = name;
        if(color) target.public.color = color;
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    statlock:(victim, param)=>{
        if(victim.level < KING_LEVEL) return; // Must be King or higher
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        target.statlocked = !target.statlocked;
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    // Pope-only commands (level 2)
    smute:(victim, param)=>{
        if(victim.level < 2) return; // Must be Pope
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        target.muted = !target.muted;
        
        // If muting, also interrupt any voice chat
        if(target.muted) {
            // Remove speaking status if active and restore original name
            if(target.public.speaking) {
                target.public.name = target.originalName || target.public.name.replace(" (speaking)", "");
                target.public.speaking = false;
            }
            target.public.name += " (muted)";
            // Notify all clients to interrupt voice chat
            victim.room.emit("voiceMuted", {
                guid: target.public.guid,
                muted: true,
                name: target.public.name
            });
        } else {
            target.public.name = target.public.name.replace(" (muted)", "");
        }
        
        target.socket.emit("muted", {muted: target.muted}); // Send mute status to client
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    floyd:(victim, param)=>{
        if(victim.level < KING_LEVEL) return; // Changed to KING_LEVEL (1.1)
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        target.socket.emit("nuke");
    },

    deporn:(victim, param)=>{
        if(victim.level < 2) return; // Must be Pope
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Add the crosscolor to blacklist
        if(target.public.color.startsWith('http')) {
            blacklist.push(target.public.color);
            // Save blacklist to file
            fs.writeFileSync("./config/blacklist.txt", blacklist.join("\n"));
        }

        // Set humiliating properties
        target.public.name = "I love men";
        target.public.color = "jew";
        target.public.tagged = true;
        target.public.tag = "ME LOVE MEN!";

        // Update the user
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    kick:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL) return; // Must be Higher King or above
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        // Log the kick
        console.log(`[KICK] ${victim.public.name} kicked ${target.public.name}`);
        
        target.socket.emit("kick", {reason: "Kicked by an operator"});
        target.socket.disconnect();
    },

    tempban:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL && victim.level < POPE_LEVEL) return; // Must be Higher King or Pope
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }

        // Log the temporary ban
        console.log(`[TEMP BAN] ${victim.public.name} banned ${target.public.name} (${target.ip}) for 10 minutes`);

        // Add IP to tempBans
        if (!global.tempBans) global.tempBans = new Set();
        global.tempBans.add(target.ip);
        
        // Set timeout to remove ban after 10 minutes
        setTimeout(() => {
            if (global.tempBans && global.tempBans.has(target.ip)) {
                global.tempBans.delete(target.ip);
                console.log(`[TEMP BAN EXPIRED] Ban expired for IP ${target.ip}`);
            }
        }, 10 * 60 * 1000); // 10 minutes
        
        // Disconnect the user
        target.socket.emit("ban", {
            reason: "Temporarily banned by operator (10 minutes)",
            end: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
        target.socket.disconnect();
    },

    // Add new commands for announcements and polls
    announce:(victim, param) => {
        if (victim.level < RABBI_LEVEL) return; // Must be Rabbi or higher
        if(victim.room) victim.room.emit("announcement", {
            from: victim.public.name,
            msg: param
        });
    },

    poll:(victim, param) => {
        if (victim.level < RABBI_LEVEL) return; // Must be Rabbi or higher
        
        if (victim.room.poll.active) {
            victim.socket.emit("talk", {
                guid: victim.public.guid,
                text: "A poll is already active!"
            });
            return;
        }

        victim.room.poll = {
            active: true,
            name: param,
            yes: 0,
            no: 0,
            voted: new Set()
        };

        if(victim.room) victim.room.emit("pollshow", param);
        if(victim.room) victim.room.emit("pollupdate", {
            yes: 0,
            no: 0,
            votecount: 0
        });

        // Auto-end poll after 5 minutes
        setTimeout(() => {
            victim.room.endPoll();
        }, 5 * 60 * 1000);
    },

    fullmute:(victim, param)=>{
        if(victim.level < 2) return; // Must be Pope
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        target.muted = !target.muted;
        
        // If muting, also interrupt any voice chat
        if(target.muted) {
            // Remove speaking status if active and restore original name
            if(target.public.speaking) {
                target.public.name = target.originalName || target.public.name.replace(" (speaking)", "");
                target.public.speaking = false;
            }
            target.public.name += " (muted)";
            // Notify all clients to interrupt voice chat
            victim.room.emit("voiceMuted", {
                guid: target.public.guid,
                muted: true,
                name: target.public.name
            });
        } else {
            target.public.name = target.public.name.replace(" (muted)", "");
        }
        
        target.socket.emit("muted", {muted: target.muted}); // Send mute status to client
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    ban:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL && victim.level < POPE_LEVEL) return; // Must be Higher King or Pope
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }

        // Add IP to tempBans
        if (!global.tempBans) global.tempBans = new Set();
        global.tempBans.add(target.ip);
        
        // Disconnect the user
        target.socket.emit("ban", {
            reason: "Banned by admin",
            end: new Date(Date.now() + 24*60*60*1000).toISOString()
        });
        target.socket.disconnect();
    },

    voicemute:(victim, param) => {
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;
        
        target.voiceMuted = !target.voiceMuted;
        target.public.voiceMuted = target.voiceMuted;
        
        // If muting, remove speaking status if active
        if(target.voiceMuted && target.public.speaking) {
            target.public.name = target.originalName || target.public.name.replace(" (speaking)", "");
            target.public.speaking = false;
        }
        
        if(target.voiceMuted) {
            target.public.name += " (voice muted)";
        } else {
            target.public.name = target.public.name.replace(" (voice muted)", "");
        }
        
        // Notify all clients in the room about the voice mute status change
        // This allows immediate interruption of any playing audio
        victim.room.emit("voiceMuted", {
            guid: target.public.guid,
            muted: target.voiceMuted,
            name: target.public.name
        });
        
        target.socket.emit("voiceMuted", {muted: target.voiceMuted});
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
    },

    sanitize:(victim, param) => {
        if (victim.level < 2) { // Must be Pope
            victim.socket.emit("sanitize", { success: false });
            return;
        }
        
        // Toggle only this pope's sanitization
        victim.sanitize = !victim.sanitize;
        
        // Notify everyone about this pope's sanitization status
        if(victim.room) {
            victim.room.emit("sanitize", {
                success: true,
                enabled: victim.sanitize,
                pope: victim.public.name,
                guid: victim.public.guid
            });
        }
    },

    update: function(user) {
        if (user.level < POPE_LEVEL) {
            user.socket.emit("alert", "You must be a pope to use this command!");
            return;
        }
        
        try {
            // Clear require cache for config files
            delete require.cache[require.resolve('./config/config.json')];
            delete require.cache[require.resolve('./config/colors.json')];
            delete require.cache[require.resolve('./config/commands.json')];
            
            // Reload config files
            config = require('./config/config.json');
            colors = require('./config/colors.json');
            commands = require('./config/commands.json');
            
            // Notify success
            user.socket.emit("alert", "Successfully reloaded config files!");
            debug('Config files reloaded by pope:', user.public.name);
        } catch (err) {
            user.socket.emit("alert", "Error reloading config: " + err.message);
            debug('Error reloading config:', err);
        }
    },

    // Add new Higher King commands
    massbless:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL) return; // Must be Higher King or above
        if(!victim.room) return;
        
        // Bless all users in the room except those with higher authority
        victim.room.users.forEach(target => {
            if(target.level < HIGHER_KING_LEVEL) {
                target.level = BLESSED_LEVEL;
                target.public.tagged = true;
                target.public.tag = "Blessed";
                target.public.color = "bless";
                target.socket.emit("authlv", {level: target.level});
                victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
            }
        });
    },

    BAN:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL) return; // Must be Higher King or above
        if(!victim.room) return;
        let target = victim.room.users.find(u => u.public.guid == param);
        if(!target) return;

        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }

        // Log the ban
        console.log(`[HIGHER KING BAN] ${victim.public.name} banned ${target.public.name} (${target.ip})`);

        // Add IP to tempBans
        if (!global.tempBans) global.tempBans = new Set();
        global.tempBans.add(target.ip);
        
        // Disconnect the user
        target.socket.emit("ban", {
            reason: "Banned by Higher King",
            end: new Date(Date.now() + 24*60*60*1000).toISOString()
        });
        target.socket.disconnect();
    },

    "debug:mobile":(victim, param)=>{
        victim.socket.emit("debug:mobile");
        victim.socket.emit("alert", "Mobile mode toggled");
    },

    hanukkahify:(victim, param)=>{
        if(victim.level < HIGHER_KING_LEVEL) return; // Must be Higher King or above
        if(!victim.room) return;
        let [targetId, duration] = param.split(" ");
        let target = victim.room.users.find(u => u.public.guid == targetId);
        if(!target) return;
        
        // Check if king trying to affect another king
        if (!canKingAffectKing(victim.level, target.level)) {
            victim.socket.emit("alert", "Kings cannot affect other kings!");
            return;
        }
        
        // Show warning and confirmation to the operator
        victim.socket.emit("hanukkah_confirm", {
            targetName: target.public.name,
            duration: duration
        });
        
        // Set level and appearance
        target.level = LOWER_RABBI_LEVEL;
        target.public.color = "jew";
        target.public.tagged = true;
        target.public.tag = "Hanukkah";
        target.socket.emit("authlv", {level: target.level});
        target.socket.emit("authlv2", {level: target.level});
        
        // Generate a unique identifier for this user that persists across logins
        const userIdentifier = hashPassword(target.public.name + ":" + getRealIP(target.socket)).substring(0, 16);
        
        // Set expiry if not forever
        if(duration.toLowerCase() !== "forever") {
            duration = parseInt(duration);
            if(isNaN(duration)) return;
            
            const expiry = Date.now() + (duration * 60 * 1000);
            // Generate secure auth key for the cookie
            const authKey = hashPassword(expiry + ":" + (config.secret || "BonziWORLD")).substring(0, 16);
            const secureToken = expiry + ":" + authKey;
            
            // Register this as a legitimate cookie
            legitimateCookies.set(userIdentifier, secureToken);
            
            // Store the identifier in the cookie for verification
            const cookieValue = userIdentifier + ":" + secureToken;
            
            target.socket.emit("setHanukkahCookie", {
                expiry: cookieValue,
                duration: duration * 60
            });
            
            // Set timeout to remove status
            setTimeout(() => {
                if(target.socket.connected) {
                    target.level = DEFAULT_LEVEL;
                    target.public.color = colors[Math.floor(Math.random()*colors.length)];
                    target.public.tagged = false;
                    target.public.tag = "";
                    target.socket.emit("authlv", {level: target.level});
                    target.socket.emit("authlv2", {level: target.level});
                    target.socket.emit("clearHanukkahCookie");
                    
                    // Remove from legitimate cookies registry
                    legitimateCookies.delete(userIdentifier);
                    
                    if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
                }
            }, duration * 60 * 1000);
        } else {
            // Set permanent cookie
            legitimateCookies.set(userIdentifier, "forever");
            
            // Store the identifier in the cookie for verification
            const cookieValue = userIdentifier + ":forever";
            
            target.socket.emit("setHanukkahCookie", {
                expiry: cookieValue,
                duration: "permanent"
            });
        }
        
        // Show Hanukkah page to target
        target.socket.emit("hanukkah");
        
        // Update room
        if(victim.room) victim.room.emit("update", {guid:target.public.guid, userPublic:target.public});
        
        // Log the action
        console.log(`[HANUKKAH] ${victim.public.name} made ${target.public.name} a Lower Rabbi (${duration === "forever" ? "permanent" : duration + " minutes"})`);
    },
};

// Start server
http.listen(config.port || 80, () => {
    rooms["default"] = new room("default");
    console.log("running at http://bonzi.localhost:" + (config.port || 80));
});
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Update sanitize function to allow script tags
function sanitize(text, user) {
    // If user is a pope and has disabled their sanitization, allow all scripts
    if (user.level >= 2 && !user.sanitize) {
        return text;
    }
    
    // For everyone else, only allow <script> tags but sanitize other HTML
    if(filtertext(text)) return "##########";
    
    // Temporarily protect <script> tags
    text = text.replace(/<script>/g, "##SCRIPTOPEN##");
    text = text.replace(/<\/script>/g, "##SCRIPTCLOSE##");
    
    // Sanitize other HTML
    text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Restore script tags
    text = text.replace(/##SCRIPTOPEN##/g, "<script>");
    text = text.replace(/##SCRIPTCLOSE##/g, "</script>");
    
    return text;
}

// Add to the command handler section
function validateCommand(socket, command, param) {
    const now = Date.now();
    
    // Reset command counters every 10 seconds
    if (now - socket.userData.lastCommandReset > 10000) {
        socket.userData.commandCount = 0;
        socket.userData.lastCommandReset = now;
    }

    // Increment command counter
    socket.userData.commandCount++;

    // Check for command spam
    if (socket.userData.commandCount > 20) {
        return false;
    }

    // Track specific commands
    switch(command) {
        case "name":
            socket.userData.nameChanges++;
            socket.userData.lastNameChange = now;
            if (socket.userData.nameChanges > 5 && (now - socket.userData.lastNameChange) < 10000) {
                return false;
            }
            break;
            
        case "color":
            // Block known malicious image URLs
            if (param && typeof param === 'string') {
                try {
                    const url = new URL(param);
                    if (BLOCKED_IMAGE_DOMAINS.includes(url.hostname)) {
                        return false;
                    }
                } catch(e) {
                    // Not a URL, continue normal processing
                }
            }
            socket.userData.colorChanges++;
            socket.userData.lastColorChange = now;
            if (socket.userData.colorChanges > 5 && (now - socket.userData.lastColorChange) < 10000) {
                return false;
            }
            break;
    }

    return true;
}

