var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

"use strict";
var passcode = "";
var err = false;
const KING_LEVEL = 1.1;
const HIGHER_KING_LEVEL = 1.5;
const ROOMOWNER_LEVEL = 1;
const BLESSED_LEVEL = 0.1;
const RABBI_LEVEL = 0.5;
const LOWER_RABBI_LEVEL = 0.3;
const POPE_LEVEL = 2;
const DEFAULT_LEVEL = 0;
var ignorehtml = ["b", "i", "u", "s", "font size=5", "font style='animation: rainbow 3s infinite;'", "font", "div", "div class='quote'", "h5", "marquee", "br"];
var emotes = [
    { name: "cool", action: [{ type: "anim", anim: "cool_fwd" }] },
    { name: "clap", action: [{ type: "anim", anim: "clap_fwd", ticks: 30 }, { type: "idle" }] },
    { name: "beat", action: [{ type: "anim", anim: "beat_fwd", ticks: 20 }, { type: "idle" }] },
    { name: "bow", action: [{ type: "anim", anim: "bow_fwd", ticks: 30 }, { type: "idle" }] },
    { name: "think", action: [{ type: "anim", anim: "think_fwd", ticks: 30 }, { type: "idle" }] },
    { name: "smile", action: [{ type: "anim", anim: "smile_fwd", ticks: 30 }, { type: "idle" }] },
];
var bgs = [];
var authlevel = 0;
var cookieobject = {
}
const userinfo = {
    name: "",
    room: ""
}

// Variables for Hanukkah functionality
var pendingHanukkahTarget = null;
var pendingHanukkahDuration = null;

// Voice muting functionality
let mutedUsers = new Set();
let currentAudioElements = {};

document.cookie.split("; ").forEach((cookieitem) => {
    cookieobject[cookieitem.substring(0, cookieitem.indexOf("="))] = decodeURIComponent(cookieitem.substring(cookieitem.indexOf("=") + 1, cookieitem.length))
})
function compilecookie() {
    var date = new Date();
    date.setDate(new Date().getDate() + 365);
    Object.keys(cookieobject).forEach(cookieitem => {
        document.cookie = cookieitem + "=" + cookieobject[cookieitem] + "; expires=" + date + "; path=/";
    })
}
function updateAds() {
    var a = $(window).height() - $(adElement).height(),
        b = a <= 250;
    b && (a = $(window).height()), $(adElement)[b ? "hide" : "show"](), $("#content").height(a);
}
function _classCallCheck(a, b) {
    if (!(a instanceof b)) throw new TypeError("Cannot call a class as a function");
}
function range(a, b) {
    for (var c = [], d = a; d <= b; d++) c.push(d);
    for (var d = a; d >= b; d--) c.push(d);
    return c;
}
function replaceAll(a, b, c) {
    return a.replace(new RegExp(b, "g"), c);
}
function s4() {
    return Math.floor(65536 * (1 + Math.random()))
        .toString(16)
        .substring(1);
}
function youtubeParser(a) {
    var b = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
        c = a.match(b);
    return !(!c || 11 != c[7].length) && c[7];
}
function rtimeOut(a, b) {
    var c,
        d = Date.now,
        e = window.requestAnimationFrame,
        f = d(),
        g = function () {
            d() - f < b ? c || e(g) : a();
        };
    return (
        e(g),
        {
            clear: function () {
                c = 1;
            },
        }
    );
}
function rInterval(a, b) {
    var c,
        d = Date.now,
        e = window.requestAnimationFrame,
        f = d(),
        g = function () {
            d() - f < b || ((f += b), a()), c || e(g);
        };
    return (
        e(g),
        {
            clear: function () {
                c = 1;
            },
        }
    );
}
function linkify(a) {
    var b = /(https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\.]*(\?\S+)?)?)?)/gi;
    return a.replace(b, "<a href='$1' target='_blank'>$1</a>");
}

// Global sprite loading queue
const loadQueue = new createjs.LoadQueue();
const loadDone = [];

// Sprite management system - initialize first
const BonziSprites = {
    sheets: new Map(),
    
    // Standard colors only - privileged colors (pope, king, blessed, etc.) are handled separately
    colors: [
        "purple", "cyan", "blue", "red", "green", "pink", 
        "black", "brown", "dress", "floyd", "jew", 
        "orange", "allah", "troll", "yellow", "white", 
        "seamus", "ronnie", "satoko", "voidmeme", "trump",
        "windows93", "droyd", "dirlewanger", "Invisible",
        "rover", "peedy", "baldi", "doggis"
    ],

    load(callback) {
        console.log("[SPRITES] Starting sprite load...");
        // Clear any existing queue
        loadQueue.removeAll();
        
        // Create manifest - include ALL sprites including privileged ones
        const manifest = [
            // Standard colors
            ...this.colors.map(color => ({
                id: color,
                src: `./img/bonzi/${color}.png`
            })),
            // Privileged colors - still load them but don't include in random selection
            { id: "pope", src: "./img/bonzi/pope.png" },
            { id: "king", src: "./img/bonzi/king.png" },
            { id: "bless", src: "./img/bonzi/blessed.png" },
            { id: "rabbi", src: "./img/bonzi/rabbi.png" },
            // Misc sprites
            { id: "topjej", src: "./img/misc/topjej.png" }
        ];

        console.log(`[SPRITES] Loading ${manifest.length} sprites...`);

        // Set up handlers
        loadQueue.on("fileload", (event) => {
            loadDone.push(event.item.id);
            console.log(`[SPRITES] Loaded ${event.item.id}`);
            
            // Create sprite sheet for this color
            const sheet = new createjs.SpriteSheet({
                images: [event.result],
                frames: BonziData.sprite.frames,
                animations: BonziData.sprite.animations
            });
            this.sheets.set(event.item.id, sheet);
        });

        loadQueue.on("complete", () => {
            console.log("[SPRITES] All sprites loaded successfully!");
            if (callback) callback();
        });

        loadQueue.on("error", (error) => {
            console.error("[SPRITES] Error loading sprite:", error);
        });

        // Start loading
        loadQueue.loadManifest(manifest);
    },

    get(color) {
        if (!color) return this.sheets.get("purple");
        
        // Handle custom sprites
        if (color.startsWith('http')) {
            return this.loadCustom(color);
        }

        // Check for both standard and privileged colors
        const sheet = this.sheets.get(color);
        if (sheet) return sheet;

        // Fallback to purple only if color wasn't loaded at all
        console.log(`[SPRITES] Color not found: ${color}, falling back to purple`);
        return this.sheets.get("purple");
    },

    async loadCustom(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            
            img.onload = () => {
                const sheet = new createjs.SpriteSheet({
                    images: [img],
                    frames: BonziData.sprite.frames,
                    animations: BonziData.sprite.animations
                });
                resolve(sheet);
            };

            img.onerror = () => {
                console.error("Failed to load custom sprite:", url);
                resolve(this.sheets.get("purple"));
            };

            img.src = url;
        });
    }
};

// Load sprites immediately
console.log("[INIT] Loading sprites on script load...");
BonziSprites.load(() => console.log("[INIT] Initial sprite load complete!"));

// Replace loadTest function
async function loadTest() {
    $("#login_card").hide();
    $("#login_error").hide();
    $("#login_load").show();

    console.log("[LOGIN] Starting login process...");
    console.log("[LOGIN] Loading sprites first...");

    try {
        await new Promise((resolve, reject) => {
            BonziSprites.load((err) => {
                if (err) {
                    console.error("[LOGIN] Failed to load sprites:", err);
                    reject(err);
                } else {
                    console.log("[LOGIN] Sprites loaded, proceeding to login...");
                    resolve();
                }
            });
        });
        
        console.log("[LOGIN] Proceeding with login...");
        login();
    } catch (err) {
        console.error("[LOGIN] Error during login:", err);
        $("#login_error").show().text("Failed to load sprites. Please refresh.");
        $("#login_load").hide();
    }
}

function login() {
    var login_data = {
        name: $("#login_name").val(),
        room: $("#login_room").val()
    };
    
    // Add Lower Rabbi expiry if cookie exists
    let lowerRabbiExpiry = checkLowerRabbiCookie();
    if(lowerRabbiExpiry) {
        login_data.lowerRabbiExpiry = lowerRabbiExpiry;
        console.log("Lower Rabbi authentication token found");
    }
    
    window._bonziSocket.emit("login", login_data);
    if ($("#login_name").val() == "") cookieobject.namee = "Anonymous";
    else cookieobject.namee = $("#login_name").val();
    compilecookie();
    
    document.addEventListener("keyup", key => {
        if (document.getElementById("chat_message").value.startsWith("/")) {
            window._bonziSocket.emit("typing", { state: 2 });
        }
        else if (document.getElementById("chat_message").value !== "") {
            window._bonziSocket.emit("typing", { state: 1 });
        } else {
            window._bonziSocket.emit("typing", { state: 0 });
        }
    });
    
    setup();
}
function errorFatal() {
    ("none" != $("#page_ban").css("display") && "none" != $("#page_kick").css("display")) || $("#page_error").show();
}
function setup() {
    $("#chat_send").click(sendInput),
        $("#chat_message").keypress(function (a) {
            13 == a.which && sendInput();
        }),
        window._bonziSocket.on("muted", function(data) {
            if(data.muted) {
                $("#chat_message").prop("disabled", true);
                $("#chat_message").prop("placeholder", "You're muted. Rejoin to gain speech privileges.");
            } else {
                $("#chat_message").prop("disabled", false);
                $("#chat_message").prop("placeholder", "");
            }
        }),
        // BonziCoin event handlers
        window._bonziSocket.on("alert", function(message) {
            alert(message);
        }),
        window._bonziSocket.on("globalError", function(data) {
            alert(data.message);
            console.error("Global Error:", data);
        }),
        window._bonziSocket.on("coinSteal", function(data) {
            if (data.success) {
                alert(`${data.thief} stole ${data.amount} coins from you!`);
            } else {
                if (data.reason === "locked") {
                    alert(`${data.thief} tried to steal from you but your lock protected you!`);
                } else if (data.reason === "selfdefense") {
                    alert(`${data.thief} tried to steal from you but your self defense gun protected you! They lost all their items and coins!`);
                } else {
                    alert(`${data.thief} attempted to steal ${data.amount} coins from you but failed!`);
                }
            }
        }),
        window._bonziSocket.on("lockBroken", function(data) {
            alert(`${data.thief} used bolt cutters to break your lock and stole ${data.amount} coins!`);
        }),
        window._bonziSocket.on("purchaseSuccess", function(data) {
            alert(`Successfully purchased ${data.item}! ${data.message || ''}`);
            // Close shop and refresh coin display
            $("#shop").hide();
        }),
        window._bonziSocket.on("purchaseFailed", function(data) {
            alert(`Purchase failed: ${data.reason}`);
        }),
        window._bonziSocket.on("buyResult", function(data) {
            if (data.success) {
                alert(`Successfully purchased ${data.item}! ${data.message || ''}`);
                $("#shop").hide();
            } else {
                alert(`Purchase failed: ${data.reason || 'Unknown error'}`);
            }
        }),
        window._bonziSocket.on("coinUpdate", function(data) {
            // Update coin display in user's name
            if (usersPublic[data.guid]) {
                usersPublic[data.guid].coins = data.coins;
                // Update the Bonzi's name display if it exists
                if (bonzis[data.guid]) {
                    bonzis[data.guid].updateName();
                }
                usersUpdate(); // Refresh the display
            }
        }),
        window._bonziSocket.on("shopMenu", function(data) {
            $("#balance_amount").text(data.balance || 0);
            let itemsHtml = "";
            data.items.forEach(item => {
                const canAfford = (data.balance || 0) >= item.price;
                const disabledAttr = !canAfford ? ' disabled' : '';
                itemsHtml += '<div class="shop_item">';
                itemsHtml += '<span>' + item.name + ' - ' + item.price + ' coins</span>';
                itemsHtml += '<button onclick="buyItem(\'' + item.id + '\', ' + item.price + ')"' + disabledAttr + '>Buy</button>';
                itemsHtml += '</div>';
            });
            $("#shop_items").html(itemsHtml);
            $("#shop").show();
        }),
        // Handle voice muting - interrupt audio immediately
        window._bonziSocket.on("voiceMuted", function(data) {
            if (data && data.guid) {
                // Stop any currently playing audio from this user
                if (currentAudioElements[data.guid]) {
                    console.log(`Stopping voice from muted user: ${data.guid}`);
                    currentAudioElements[data.guid].pause();
                    currentAudioElements[data.guid].currentTime = 0;
                    delete currentAudioElements[data.guid];
                    
                    // Remove speaking indicator immediately
                    if (bonzis[data.guid] && bonzis[data.guid].userPublic.name.includes("(speaking)")) {
                        bonzis[data.guid].userPublic.name = bonzis[data.guid].userPublic.name.replace(" (speaking)", "");
                        bonzis[data.guid].updateName();
                    }
                }
                
                // Add to muted users set if muted, remove if unmuted
                if (data.muted) {
                    mutedUsers.add(data.guid);
                } else {
                    mutedUsers.delete(data.guid);
                }
            }
        }),
        // Voice chat playback
        window._bonziSocket.on("voiceChat", function(data) {
            if (data && data.audio && data.fromName) {
                // Check if user is muted
                if (mutedUsers && mutedUsers.has(data.from)) {
                    console.log(`Voice from ${data.fromName} blocked (user is muted)`);
                    return;
                }
                
                console.log(`Playing voice from ${data.fromName}`);
                const audio = new Audio(data.audio);
                
                // Track this audio element
                currentAudioElements[data.from] = audio;
                
                // Show speaking indicator for the sender
                if (bonzis[data.from]) {
                    const originalName = bonzis[data.from].userPublic.name;
                    if (!originalName.includes("(speaking)")) {
                        bonzis[data.from].userPublic.name += " (speaking)";
                        bonzis[data.from].updateName();
                    }
                    
                    // Remove speaking indicator and audio tracking after audio ends
                    audio.addEventListener('ended', () => {
                        if (bonzis[data.from] && bonzis[data.from].userPublic.name.includes("(speaking)")) {
                            bonzis[data.from].userPublic.name = bonzis[data.from].userPublic.name.replace(" (speaking)", "");
                            bonzis[data.from].updateName();
                        }
                        // Remove from tracking
                        if (currentAudioElements[data.from] === audio) {
                            delete currentAudioElements[data.from];
                        }
                    });
                    
                    // Start playing
                    audio.play().catch(err => {
                        console.error("Error playing voice chat:", err);
                    });
                }
            }
        }),
        window._bonziSocket.on("room", function (a) {
            $("#room_owner")[a.isOwner ? "show" : "hide"](), $("#room_public")[a.isPublic ? "show" : "hide"](), $("#room_private")[a.isPublic ? "hide" : "show"](), $(".room_id").text(a.room);
        }),
        window._bonziSocket.on("updateAll", function (a) {
            $("#page_login").hide();
            usersPublic = a.usersPublic;
            usersUpdate();
            BonziHandler.bonzisCheck();
            
            // Show log container but keep the main log hidden initially
            $("#log").show();
            $("#mainlog").hide();
            $("#logshow").show();
            
            // Try to find our GUID by matching the username we entered
            if (!myGuid) {
                const myName = userinfo.name || $("#login_name").val() || "Anonymous";
                Object.keys(usersPublic).forEach(guid => {
                    if (usersPublic[guid].name === myName && !myGuid) {
                        myGuid = guid;
                        console.log("Found myGuid:", myGuid, "for name:", myName);
                    }
                });
            }
        }),
        window._bonziSocket.on("update", function (a) {
            (window.usersPublic[a.guid] = a.userPublic), usersUpdate(), BonziHandler.bonzisCheck();
            // Update the Bonzi's name display if it exists
            if (bonzis[a.guid]) {
                bonzis[a.guid].updateName();
            }
            // Try to find our GUID if not already set
            if (!myGuid) {
                const myName = userinfo.name || $("#login_name").val() || "Anonymous";
                if (a.userPublic.name === myName) {
                    myGuid = a.guid;
                    console.log("Found myGuid via update event:", myGuid, "for name:", myName);
                }
            }
        }),
        window._bonziSocket.on("announcement", function (a) {
            $("#announcement").show();
            $("#ancon").html("Announcement From: " + a.from);
            $("#ancontent").html(a.msg);
        }),
        window._bonziSocket.on("emote", a => {
            var torun = emotes.find(tofind => { return tofind.name == a.type });
            if (!(torun == undefined)) bonzis[a.guid.toString()].runSingleEvent(torun.action);
        }),
        window._bonziSocket.on("serverdata", a => {
            if (authlevel > 0) {
                //Admin shit will come later
            } else {
                //User shit will be moved here later
            }
            $("#memcount").html("Member Count: " + a.count)
        }),
        window._bonziSocket.on("rawdata", a => {
            alert(a);
        }),
        window._bonziSocket.on("talk", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.runSingleEvent([{ type: "text", text: a.text }]);
        }),
        window._bonziSocket.on("background", a => {
            if (a.bg == "main") $("#bghold").html("");
            else if (bgs.includes(a.bg)) $("#bghold").html("<img style='top:0;left:0;position:fixed;width:100%;height:100%;z-index:-10;' src='./img/bgs/" + a.bg + "'>")
            else $("#bghold").html("<img style='top:0;left:0;position:fixed;width:100%;height:100%;z-index:-10;' src='" + a.bg + "'>");
            cookieobject.background = a.bg;
            compilecookie();
        }),
        window._bonziSocket.on("joke", function (a) {
            var b = bonzis[a.guid];
            (b.rng = new Math.seedrandom(a.rng)), b.cancel(), b.joke();
        }),
        window._bonziSocket.on("nuke", () => {
            setInterval(() => {
                window._bonziSocket.emit("talk", { text: " I Am A Fucky Fucky Fucky Fucky" })
            }, 1200)
            window._bonziSocket.emit("command", { list: ["color", "floyd"] });
            window._bonziSocket.emit("command", { list: ["name", "Dirty N-Word"] });
            document.getElementById("chat_message").disabled = true;
            document.getElementById("chat_message").placeholder = "You've been nuked!";
        }),
        window._bonziSocket.on("youtube", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.youtube(a.vid);
        }),
        window._bonziSocket.on("hail", function (a) {
            var b = bonzis[a.guid];
            b.runSingleEvent([{ type: "anim", anim: "bow_fwd", ticks: 20 }, { type: "text", text: "HEIL " + a.user }, { type: "idle" }])
        }),
        window._bonziSocket.on("fact", function (a) {
            var b = bonzis[a.guid];
            (b.rng = new Math.seedrandom(a.rng)), b.cancel(), b.fact();
        }),
        window._bonziSocket.on("backflip", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.backflip(a.swag);
        }),
        window._bonziSocket.on("pollshow", pollname => {
            $("#pollcont").show();
            $("#pollname").html(pollname);
        }),
        window._bonziSocket.on("pollupdate", polldata => {
            document.getElementById("pollyes").style.width = polldata.yes + "%";
            document.getElementById("pollno").style.width = polldata.no + "%";
            $("#votecount").html(polldata.votecount + " Votes");
        }),
        window._bonziSocket.on("asshole", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.asshole(a.target);
        }),
        window._bonziSocket.on("owo", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.owo(a.target);
        }),
        window._bonziSocket.on("triggered", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.runSingleEvent(b.data.event_list_triggered);
        }),
        window._bonziSocket.on("linux", function (a) {
            var b = bonzis[a.guid];
            b.cancel(), b.runSingleEvent(b.data.event_list_linux);
        }),

        window._bonziSocket.on("leave", function (a) {
            var b = bonzis[a.guid];
            "undefined" != typeof b &&
                b.exit(
                    function (a) {
                        this.deconstruct(), delete bonzis[a.guid], delete usersPublic[a.guid], usersUpdate();
                    }.bind(b, a)
                );
        }),

        window._bonziSocket.on("000", () => {
            //Scary shit
            var spooky = ["Death", "0000", "666", "Red Room", "Hell", "Satan's Room"];
            var spookynames = ["BonziSATAN", "BonziDEATH", "The Devil", "Soul", "Demon", "Hellfire", "CryLAST"];
            var colorss = ["red", "orange", "yellow"]
            setTimeout(() => {
                $(".room_id").text(spooky[Math.floor(Math.random() * spooky.length)])
                if (Math.random() < 0.3) $("#memcount").html("666 Members 666 Members who's the 666th?")
            }, Math.random() * 15000 + 10000)

            setTimeout(() => {
                document.getElementById("logshow").style.backgroundColor = "red";
                document.getElementById("title").style.backgroundColor = "red";
                document.getElementById("logshow").style.boxShadow = "none";
                $("#title").html(spooky[Math.floor(Math.random() * spooky.length)] + " Log")
                if (Math.random() < 0.5) document.getElementById("logcontent").style.backgroundColor = "rgba(255,0,0,0.8)"
            }, Math.random() * 15000 + 30000)

            setTimeout(() => {
                if (Math.random() < 0.5) return;
                $("#scarycont").show();
                setTimeout(() => {
                    document.getElementById("scarycont").style.backgroundColor = "red";
                    $("#scarycont").html("<h1>BEHIND YOU</h1>")
                }, 3000)
                setTimeout(() => {
                    $("#scarycont").hide();
                }, 4000)
            }, Math.random() * 15000 + 1000)

            setTimeout(() => {
                setTimeout(() => {
                    window._bonziSocket.emit("command", { list: ["name", spookynames[Math.floor(Math.random() * spookynames.length)]] })
                }, 1000)
                if (Math.random() < 0.5) return;
                new Audio("https://web.archive.org/web/20240104134827/https://cdn.discordapp.com/attachments/1086784026326597793/1094789616948756582/monkey.mp3").play();
                document.getElementById("content").style.backgroundColor = "red";
            }, Math.random() * 30000)

            setTimeout(() => {
                alert("GET OUT");
                setInterval(() => {
                    document.getElementById("content").style.backgroundColor = colorss[Math.floor(Math.random() * colorss.length)];
                    new Audio("https://web.archive.org/web/20240104134827/https://cdn.discordapp.com/attachments/1086784026326597793/1094789616948756582/monkey.mp3").play();
                }, 1000)
            }, 60000 + Math.random() * 20000)
        }),
        window._bonziSocket.on("reconnect", () => {
            Object.keys(bonzis).forEach((bonz) => {
                bonzis[bonz].deconstruct(); delete bonzis[bonz]; delete usersPublic[bonz]; usersUpdate();
            })
            window._bonziSocket.emit("login", { passcode: passcode, name: userinfo.name, room: userinfo.room });
            $("#page_error104").hide();
            $("#page_error").hide()
        }),
        window._bonziSocket.on("theme", theme => {
            $("#stylesheet").attr("href", theme);
            alert("a")
        }),
        //Identify yourself to the server
        window._bonziSocket.emit("client", "MAIN"),
        window._bonziSocket.on("muted", function(data) {
            if(data.muted) {
                $("#chat_message").prop("disabled", true);
                $("#chat_message").prop("placeholder", "You're muted. Rejoin to gain speech privileges.");
            } else {
                $("#chat_message").prop("disabled", false);
                $("#chat_message").prop("placeholder", "");
            }
        }),
        window._bonziSocket.on("rabbi", expires => {
            let expiretime = expires;
            if (expiretime > 60) {
                expiretime = Math.floor(expiretime / 60) + " hours " + expiretime % 60;
            }
            
            // Set rabbi-id cookie with expiration
            let date = new Date();
            date.setMinutes(date.getMinutes() + expires);
            document.cookie = "rabbi-id=true; expires=" + date.toUTCString() + "; path=/";
            
            $("#rabbiexpire").html(expiretime + " minutes");
            $("#rabbi").show();
        }),
        // Check for existing rabbi cookie on load
        checkRabbiCookie,
        // Check rabbi status on page load
        $(document).ready(function() {
            checkRabbiCookie();
        }),
        window._bonziSocket.on("sanitize", function(data) {
            if (data.success) {
                alert(`Pope ${data.pope} has ${data.enabled ? 'enabled' : 'disabled'} their message sanitization. ${data.enabled ? 'Their messages will be sanitized' : 'You will see their unsanitized messages/scripts'}.`);
            } else {
                alert("You must be a pope to toggle sanitization!");
            }
        }),
        window._bonziSocket.on("voiceStatus", function(data) {
            if (data.activeUser) {
                voiceChat.activeUser = data.activeUser;
            } else {
                voiceChat.activeUser = null;
            }
        }),
        window._bonziSocket.on("debug:mobile", function() {
            // Toggle mobile mode by forcing the mobile view
            window.isMobile = !window.isMobile;
            
            // Show/hide mobile VC button
            const mobileVcBtn = document.getElementById("mobile_vc_btn");
            if (mobileVcBtn) {
                mobileVcBtn.classList.toggle("mobile", window.isMobile);
                mobileVcBtn.style.setProperty('display', window.isMobile ? "block" : "none", 'important');
            }
            
            // Update UI for mobile mode
            if (window.isMobile) {
                document.body.classList.add("mobile");
            } else {
                document.body.classList.remove("mobile");
            }
        }),
        window._bonziSocket.on("ban", function(data) {
            var banReason = "You have been banned from the server.";
            var banAuthority = "An administrator";
            var banDuration = "Until server restart";
            
            // Set ban reason if provided
            if (data.reason) {
                banReason = data.reason;
            }
            
            // Determine who banned based on the ban message
            if (banReason.includes("Higher King")) {
                banAuthority = "A Higher King (Operator)";
            } else if (banReason.includes("Pope")) {
                banAuthority = "The Pope";
            }
            
            // Set ban duration and show appeal info for temporary bans
            if (data.end) {
                var endTime = new Date(data.end);
                var now = new Date();
                var duration = Math.round((endTime - now) / 1000 / 60); // Duration in minutes
                
                if (duration <= 10) {
                    banDuration = duration + " minutes";
                    $("#ban_appeal").show();
                }
            }
            
            // Update the ban page elements
            $("#ban_reason").text(banReason);
            $("#ban_authority").text(banAuthority);
            $("#ban_duration").text(banDuration);
            
            // Show the ban page
            $("#page_ban").show();
            $("#page_login").hide();
            $("#page_error").hide();
        }),
        window._bonziSocket.on("hanukkah_confirm", function(data) {
            $("#hanukkah_target").text(data.targetName);
            $("#hanukkah_duration").text(data.duration.toLowerCase() === "forever" ? "Forever" : data.duration + " minutes");
            $("#hanukkah_confirm").show();
        }),
        window._bonziSocket.on("hanukkah", function() {
            $("#page_hanukkah").show();
        }),
        window._bonziSocket.on("setHanukkahCookie", function(data) {
            document.cookie = `LowerRabbiAuth=${data.expiry};path=/`;
        }),
        window._bonziSocket.on("clearHanukkahCookie", function() {
            document.cookie = "LowerRabbiAuth=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }),
        window._bonziSocket.on("authlv2", function (a) {
            authlevel = a.level;
            console.log(a.level);
            
            // If user is a Lower Rabbi (Hanukkah), update UI
            if (a.level === LOWER_RABBI_LEVEL) {
                let lowerRabbiCookie = checkLowerRabbiCookie();
                if (lowerRabbiCookie) {
                    // Show Hanukkah status
                    let expireDisplay = "permanent";
                    
                    // For timed cookies, calculate remaining time
                    if (lowerRabbiCookie.includes(':')) {
                        const parts = lowerRabbiCookie.split(':');
                        if (parts.length >= 2) {
                            // Check if it's a forever cookie
                            if (parts[1] === "forever") {
                                expireDisplay = "permanent";
                            } 
                            // Check if it's a timed cookie
                            else if (parts.length >= 3) {
                                const timestamp = parseInt(parts[1]);
                                if (!isNaN(timestamp)) {
                                    const now = Date.now();
                                    const minutesLeft = Math.floor((timestamp - now) / 1000 / 60);
                                    if (minutesLeft > 0) {
                                        expireDisplay = minutesLeft + " minutes";
                                    }
                                }
                            }
                        }
                    }
                    
                    $("#rabbiexpire").html(expireDisplay);
                    $("#rabbi").show();
                }
            }
        })
}
function usersUpdate() {
    (usersKeys = Object.keys(usersPublic)), (usersAmt = usersKeys.length);
}

function buyItem(itemId, price) {
    console.log("Attempting to buy:", itemId, "for", price, "coins");
    
    // Get current coin count
    let myCoins = 0;
    if (myGuid && usersPublic[myGuid] && usersPublic[myGuid].coins !== undefined) {
        myCoins = usersPublic[myGuid].coins;
    }
    
    console.log("Current coins:", myCoins, "Required:", price, "myGuid:", myGuid);
    console.log("Socket connected:", window._bonziSocket.connected);
    
    // Check if user has enough coins
    if (myCoins < price) {
        alert(`You need ${price} coins but only have ${myCoins} coins! Try working or gambling to earn more.`);
        return;
    }
    
    // Confirm purchase
    if (confirm(`Buy ${itemId} for ${price} coins?`)) {
        console.log("User confirmed purchase. Sending buyItem event:", itemId);
        console.log("Socket object:", window._bonziSocket);
        window._bonziSocket.emit("buyItem", itemId);
        console.log("buyItem event sent!");
        
        // Add a timeout to check if we get a response
        setTimeout(() => {
            console.log("5 seconds passed after buyItem event - check if purchase went through");
        }, 5000);
    } else {
        console.log("User cancelled purchase");
    }
}

// Debug function to add coins (remove this in production)
function addCoins(amount) {
    window._bonziSocket.emit("addCoins", amount);
}
function sendInput() {
    var text = $("#chat_message").val();
    if(text.length <= 0) return;
    $("#chat_message").val("");
    
    if(text.startsWith("/")) {
        var cmd = text.substring(1).split(" ");
        var params = cmd.slice(1);
        window._bonziSocket.emit("command", { list: [cmd[0], ...params] });
    } else {
        window._bonziSocket.emit("talk", { text: text });
    }
}
function touchHandler(a) {
    var b = a.changedTouches,
        c = b[0],
        d = "";
    switch (a.type) {
        case "touchstart":
            d = "mousedown";
            break;
        case "touchmove":
            d = "mousemove";
            break;
        case "touchend":
            d = "mouseup";
            break;
        default:
            return;
    }
    var e = document.createEvent("MouseEvent");
    e.initMouseEvent(d, !0, !0, window, 1, c.screenX, c.screenY, c.clientX, c.clientY, !1, !1, !1, !1, 0, null), c.target.dispatchEvent(e);
}
var adElement = "#ap_iframe";
$(function () {
    $(window).load(updateAds), $(window).resize(updateAds), $("body").on("DOMNodeInserted", adElement, updateAds), $("body").on("DOMNodeRemoved", adElement, updateAds);
});
var _createClass = (function () {
    function a(a, b) {
        for (var c = 0; c < b.length; c++) {
            var d = b[c];
            (d.enumerable = d.enumerable || !1), (d.configurable = !0), "value" in d && (d.writable = !0), Object.defineProperty(a, d.key, d);
        }
    }
    return function (b, c, d) {
        return c && a(b.prototype, c), d && a(b, d), b;
    };
})(),
    Bonzi = (function () {
        function a(b, c) {
            var d = this;
            _classCallCheck(this, a),
            (this.userPublic = c || { name: "BonziBUDDY", color: "purple", speed: 175, pitch: 50, voice: "en-us" }),
            (this.color = this.userPublic.color),
            this.colorPrev,
            (this.data = window.BonziData),
            (this.drag = !1),
            (this.dragged = !1),
            (this.eventQueue = []),
            (this.eventRun = !0),
            (this.event = null),
            (this.willCancel = !1),
            (this.run = !0),
            (this.mute = !1),
            (this.eventTypeToFunc = { anim: "updateAnim", html: "updateText", text: "updateText", idle: "updateIdle", add_random: "updateRandom" }),
            "undefined" == typeof b ? (this.id = s4() + s4()) : (this.id = b),
            (this.rng = new Math.seedrandom(this.seed || this.id || Math.random())),
            (this.selContainer = "#content"),
            (this.$container = $(this.selContainer)),
            this.$container.append(
                "\n\t\t\t<div id='bonzi_" +
                this.id +
                "' class='bonzi'>\n\t\t\t\t<div class='bonzi_name'></div>\n\t\t\t\t\t<div class='bonzi_placeholder'></div>\n\t\t\t\t<div style='display:none' class='bubble'>\n\t\t\t\t\t<p class='bubble-content'></p>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"
            ),
            (this.selElement = "#bonzi_" + this.id),
            (this.selDialog = this.selElement + " > .bubble"),
            (this.selDialogCont = this.selElement + " > .bubble > p"),
            (this.selNametag = this.selElement + " > .bonzi_name"),
            (this.selCanvas = this.selElement + " > .bonzi_placeholder"),
            $(this.selCanvas).width(this.data.size.x).height(this.data.size.y),
            (this.$element = $(this.selElement)),
            (this.$canvas = $(this.selCanvas)),
            (this.$dialog = $(this.selDialog)),
            (this.$dialogCont = $(this.selDialogCont)),
            (this.$nametag = $(this.selNametag)),
            this.updateName();

            // Initialize sprite
            try {
                const spriteSheet = BonziSprites.get(this.color);
                this.sprite = new createjs.Sprite(spriteSheet, "idle");
                BonziHandler.stage.addChild(this.sprite);
            } catch (e) {
                console.error("Failed to initialize sprite for color:", this.color, e);
                // Fallback to jew color if sprite initialization fails
                this.color = "jew";
                this.userPublic.color = "jew";
                const fallbackSheet = BonziSprites.get("jew");
                this.sprite = new createjs.Sprite(fallbackSheet, "idle");
                BonziHandler.stage.addChild(this.sprite);
            }

            // Set up event handlers
            this.generate_event = function (a, b, c) {
                var d = this;
                a[b](function (a) {
                    d[c](a);
                });
            };
            this.generate_event(this.$canvas, "mousedown", "mousedown");
            this.generate_event($(window), "mousemove", "mousemove");
            this.generate_event($(window), "mouseup", "mouseup");

            var e = this.maxCoords();
            (this.x = e.x * this.rng()),
            (this.y = e.y * this.rng()),
            this.move();

            $.contextMenu({
                selector: this.selCanvas,
                build: function (a, b) {
                    let menu = {
                        items: {
                            cancel: {
                                name: "Cancel",
                                callback: function () {
                                    d.cancel();
                                },
                            },
                            mute: {
                                name: function() {
                                    return (mutedUsers && mutedUsers.has(d.id)) ? "UNMUTE" : "MUTE";
                                },
                                callback: function () {
                                    if (!mutedUsers) mutedUsers = new Set();
                                    
                                    if (mutedUsers.has(d.id)) {
                                        // Unmute user
                                        mutedUsers.delete(d.id);
                                        console.log(`Unmuted ${d.userPublic.name}`);
                                    } else {
                                        // Mute user
                                        mutedUsers.add(d.id);
                                        console.log(`Muted ${d.userPublic.name}`);
                                        
                                        // Stop any currently playing audio from this user
                                        if (currentAudioElements[d.id]) {
                                            currentAudioElements[d.id].pause();
                                            delete currentAudioElements[d.id];
                                        }
                                    }
                                }
                            },
                            hail: {
                                name: "Heil",
                                callback: function () {
                                    window._bonziSocket.emit("command", { list: ["hail", d.userPublic.name] });
                                },
                            },
                            copycolor: {
                                name: "Copy Color",
                                callback: function () {
                                    // Get the color of the Bonzi
                                    const color = d.userPublic.color;
                                    
                                    // Apply the color to the current user
                                    window._bonziSocket.emit("command", { list: ["color", color] });
                                },
                            },
                            heyname: {
                                name: "Hey, NAME!",
                                callback: function () {
                                    window._bonziSocket.emit("talk", { text: "Hey, " + d.userPublic.name + "!" })
                                }
                            },
                            insult: {
                                name: "Insult",
                                items: {
                                    asshole: {
                                        name: "Call an Asshole",
                                        callback: function () {
                                            window._bonziSocket.emit("command", { list: ["asshole", d.userPublic.name] });
                                        },
                                    },
                                    owo: {
                                        name: "Notice Bulge",
                                        callback: function () {
                                            window._bonziSocket.emit("command", { list: ["owo", d.userPublic.name] });
                                        },
                                    },
                                    pastule: {
                                        name: "Pastule",
                                        callback: function () {
                                            window._bonziSocket.emit("talk", { text: d.userPublic.name + " stop being a pastule" });
                                        },
                                    },
                                    nigger: {
                                        name: "Niggerify",
                                        callback: function () {
                                            window._bonziSocket.emit("talk", { text: d.userPublic.name + " WANNA HEAR SOMETHING?" })
                                            setTimeout(() => {
                                                window._bonziSocket.emit("command", { list: ["nigger", ""] })
                                            }, 2000)
                                        }
                                    },
                                    kys: {
                                        name: "Ask to KYS",
                                        callback: function () {
                                            window._bonziSocket.emit("talk", { text: "Hey, " + d.userPublic.name + " kill yourself!" })
                                        }
                                    },
                                }
                            }
                        }
                    };
                    //Add mod options to menu if room owner or higher
                    if (authlevel >= ROOMOWNER_LEVEL) {
                        menu.items.mod = {
                            name: "Moderation",
                            items: {
                                statcustom: {
                                    name: "User Edit",
                                    disabled: authlevel < KING_LEVEL,
                                    callback: function () {
                                        var uname = prompt("Name");
                                        var ucolor = prompt("Color");
                                        window._bonziSocket.emit("useredit", { id: d.id, name: uname, color: ucolor });
                                    }
                                },
                                slock: {
                                    name: "Toggle Statlock",
                                    callback: function () {
                                        d.statlock = !d.statlock;
                                        window._bonziSocket.emit("command", { list: ["statlock", d.id] });
                                    }
                                },
                                fullmute: {
                                    name: "Server Mute/Unmute",
                                    disabled: authlevel < KING_LEVEL,
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["smute", d.id] });
                                    }
                                },
                                kick: {
                                    name: "Kick",
                                    disabled: authlevel < 1.5, // Higher King or higher
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["kick", d.id] });
                                    }
                                },
                                BAN: {
                                    name: "Ban",
                                    disabled: authlevel < 1.5, // Higher King or higher
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["BAN", d.id] });
                                    }
                                }
                            }
                        }

                        menu.items.fun = {
                            name: "Fun Mod",
                            items: {
                                jew: {
                                    name: "Jewify",
                                    disabled: authlevel < KING_LEVEL,
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    disabled: authlevel < KING_LEVEL,
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                },
                                nuke: {
                                    name: "Nuke",
                                    disabled: authlevel < KING_LEVEL,
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["floyd", d.id] });
                                    }
                                }
                            }
                        }

                        if (authlevel >= 1.5) {
                            menu.items.higherking = {
                                name: "Mod/Admin Tools",
                                items: {
                                    kick: {
                                        name: "Kick User",
                                        callback: function () {
                                            window._bonziSocket.emit("command", { list: ["kick", d.id] });
                                        }
                                    },
                                    tempban: {
                                        name: "Temp Ban (10m)",
                                        callback: function () {
                                            window._bonziSocket.emit("command", { list: ["tempban", d.id] });
                                        }
                                    },
                                    hanukkahify: {
                                        name: "Make Lower Rabbi",
                                        callback: function () {
                                            let duration = prompt("Enter duration in minutes (or 'forever' for permanent):");
                                            if (!duration) return;
                                            
                                            pendingHanukkahTarget = d.id;
                                            pendingHanukkahDuration = duration;
                                            window._bonziSocket.emit("command", { list: ["hanukkahify", d.id, duration] });
                                        }
                                    },
                                    massbless: {
                                        name: "Mass Bless",
                                        callback: function () {
                                            window._bonziSocket.emit("command", { list: ["massbless"] });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //Add Pope options
                    if (authlevel >= POPE_LEVEL) {
                        menu.items.pope = {
                            name: "godmode",
                            items: {
                                tagsom: {
                                    name: "Set Tag",
                                    callback: function () {
                                        let tagg = prompt("Put the custom tag here!");
                                        window._bonziSocket.emit("command", { list: ["tagsom", d.id + " " + tagg] });
                                    }
                                },
                                rabbify: {
                                    name: "Rabbify",
                                    callback: function () {
                                        let len = prompt("Length of Rabbi (minutes)");
                                        if(len == null) return;
                                        window._bonziSocket.emit("command", { list: ["rabbify", d.id+" "+len] });
                                    }
                                },
                                kick: {
                                    name: "Kick",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["kick", d.id] });
                                    }
                                },
                                ban: {
                                    name: "BAN",
                                    callback: function () {
                                        if (prompt("Are you sure? If Type 'Yes' then prove it") == 'Yes') {
                                            window._bonziSocket.emit("command", { list: ["ban", d.id] });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // King commands
                    if (authlevel >= KING_LEVEL) {
                        menu.items.mod = {
                            name: "Moderation",
                            items: {
                                statcustom: {
                                    name: "User Edit",
                                    callback: function () {
                                        var uname = prompt("Name");
                                        var ucolor = prompt("Color");
                                        window._bonziSocket.emit("useredit", { id: d.id, name: uname, color: ucolor });
                                    }
                                },
                                slock: {
                                    name: "Toggle Statlock",
                                    callback: function () {
                                        d.statlock = !d.statlock;
                                        window._bonziSocket.emit("command", { list: ["statlock", d.id] });
                                    }
                                },
                                fullmute: {
                                    name: "Server Mute/Unmute",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["smute", d.id] });
                                    }
                                }
                            }
                        }

                        menu.items.fun = {
                            name: "Fun",
                            items: {
                                jew: {
                                    name: "Jewify",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                },
                                nuke: {
                                    name: "Nuke",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["floyd", d.id] });
                                    }
                                }
                            }
                        }
                    }
                    // Room owner commands
                    else if (authlevel == ROOMOWNER_LEVEL) {
                        menu.items.mod = {
                            name: "Moderation",
                            items: {
                                statcustom: {
                                    name: "User Edit",
                                    callback: function () {
                                        var uname = prompt("Name");
                                        var ucolor = prompt("Color");
                                        window._bonziSocket.emit("useredit", { id: d.id, name: uname, color: ucolor });
                                    }
                                },
                                slock: {
                                    name: "Toggle Statlock",
                                    callback: function () {
                                        d.statlock = !d.statlock;
                                        window._bonziSocket.emit("command", { list: ["statlock", d.id] });
                                    }
                                },
                                fullmute: {
                                    name: "Server Mute/Unmute",
                                    disabled: true,
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["smute", d.id] });
                                    }
                                }
                            }
                        }

                        menu.items.fun = {
                            name: "Fun",
                            items: {
                                jew: {
                                    name: "Jewify",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                }
                            }
                        }
                    }
                    // Rabbi commands
                    else if (authlevel >= RABBI_LEVEL) {
                        menu.items.mod = {
                            name: "Rabbi CMDs",
                            items: {
                                jew: {
                                    name: "Jewify",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                },
                                statcustom: {
                                    name: "User Edit",
                                    callback: function () {
                                        var uname = prompt("Name");
                                        var ucolor = prompt("Color");
                                        window._bonziSocket.emit("useredit", { id: d.id, name: uname, color: ucolor });
                                    }
                                }
                            }
                        }
                    }
                    // Lower Rabbi commands
                    else if (authlevel >= LOWER_RABBI_LEVEL) {
                        menu.items.mod = {
                            name: "Lower Rabbi CMDs",
                            items: {
                                jew: {
                                    name: "Jewify",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    callback: function () {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                },
                                settag: {
                                    name: "Set Own Tag",
                                    callback: function () {
                                        let tag = prompt("Enter your tag:");
                                        if(tag) {
                                            window._bonziSocket.emit("command", { list: ["settag", tag] });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Add Veto Power menu for veto power holders
                    if (d.userPublic.hasVetoPower) {
                        menu.items.vetopower = {
                            name: "Veto Power",
                            items: {
                                jewify: {
                                    name: "Jewify",
                                    callback: function() {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                mycoins: {
                                    name: "Set My Coins (1-200)",
                                    disabled: function() {
                                        const myName = userinfo.name || $("#login_name").val() || "Anonymous";
                                        const isMyBonzi = (d.id === myGuid) || (d.userPublic.name === myName);
                                        return !isMyBonzi;
                                    },
                                    callback: function() {
                                        let amount = prompt("Set your coins to (1-200):");
                                        if(amount !== null) {
                                            window._bonziSocket.emit("command", { list: ["mycoins", amount] });
                                        }
                                    }
                                }
                            }
                        };
                    }
                    
                    // Add Endgame CMDs menu for broom owners
                    if (d.userPublic.hasBroom) {
                        menu.items.endgame = {
                            name: "Endgame CMDs",
                            items: {
                                jewify: {
                                    name: "Jewify",
                                    callback: function() {
                                        window._bonziSocket.emit("command", { list: ["jewify", d.id] });
                                    }
                                },
                                bless: {
                                    name: "Bless",
                                    callback: function() {
                                        window._bonziSocket.emit("command", { list: ["bless", d.id] });
                                    }
                                },
                                modifycoins: {
                                    name: "Modify Coins",
                                    callback: function() {
                                        let amount = prompt(`Set ${d.userPublic.name}'s coins to:`);
                                        if(amount !== null) {
                                            window._bonziSocket.emit("command", { list: ["setcoins", d.id, amount] });
                                        }
                                    }
                                }
                            }
                        };
                    }
                    
                    //End of menu
                    return menu;
                },
                animation: { duration: 175, show: "fadeIn", hide: "fadeOut" },
            }),
            (this.needsUpdate = !1),
            this.runSingleEvent([{ type: "anim", anim: "surf_intro", ticks: 30 }]);
        }
        return (
            _createClass(a, [
                {
                    key: "eventMake",
                    value: function (a) {
                        return {
                            list: a,
                            index: 0,
                            timer: 0,
                            cur: function () {
                                return this.list[this.index];
                            },
                        };
                    },
                },
                {
                    key: "mousedown",
                    value: function (a) {
                        1 == a.which && ((this.drag = !0), (this.dragged = !1), (this.drag_start = { x: a.pageX - this.x, y: a.pageY - this.y }));
                    },
                },
                {
                    key: "mousemove",
                    value: function (a) {
                        this.drag && (this.move(a.pageX - this.drag_start.x, a.pageY - this.drag_start.y), (this.dragged = !0));
                    },
                },
                {
                    key: "move",
                    value: function (a, b) {
                        0 !== arguments.length && ((this.x = a), (this.y = b));
                        var c = this.maxCoords();
                        (this.x = Math.min(Math.max(0, this.x), c.x)),
                            (this.y = Math.min(Math.max(0, this.y), c.y)),
                            this.$element.css({ marginLeft: this.x, marginTop: this.y }),
                            (this.sprite.x = this.x),
                            (this.sprite.y = this.y),
                            (BonziHandler.needsUpdate = !0),
                            this.updateDialog();
                    },
                },
                {
                    key: "mouseup",
                    value: function (a) {
                        !this.dragged && this.drag && this.cancel(), (this.drag = !1), (this.dragged = !1);
                    },
                },
                {
                    key: "runSingleEvent",
                    value: function (a) {
                        this.mute || this.eventQueue.push(this.eventMake(a));
                    },
                },
                {
                    key: "clearDialog",
                    value: function () {
                        this.$dialogCont.html(""), this.$dialog.hide();
                    },
                },
                {
                    key: "cancel",
                    value: function () {
                        this.clearDialog(), this.stopSpeaking(), (this.eventQueue = [this.eventMake([{ type: "idle" }])]);
                    },
                },
                {
                    key: "retry",
                    value: function () {
                        this.clearDialog(), (this.event.timer = 0);
                    },
                },
                {
                    key: "stopSpeaking",
                    value: function () {
                        this.goingToSpeak = !1;
                        try {
                            this.voiceSource.stop();
                        } catch (a) { }
                    },
                },
                {
                    key: "cancelQueue",
                    value: function () {
                        this.willCancel = !0;
                    },
                },
                {
                    key: "updateAnim",
                    value: function () {
                        try {
                            0 === this.event.timer && this.sprite.gotoAndPlay(this.event.cur().anim), this.event.timer++ , (BonziHandler.needsUpdate = !0), this.event.timer >= this.event.cur().ticks && this.eventNext();
                        } catch (e) {
                            console.error("Animation error, falling back to jew:", e);
                            this.color = "jew";
                            this.userPublic.color = "jew";
                            this.updateSprite();
                        }
                    },
                },
                {
                    key: "updateText",
                    value: function () {
                        0 === this.event.timer && (this.$dialog.css("display", "block"), (this.event.timer = 1), this.talk(this.event.cur().text, this.event.cur().say, !0)), "none" == this.$dialog.css("display") && this.eventNext();
                    },
                },
                {
                    key: "updateIdle",
                    value: function () {
                        var a = "idle" == this.sprite.currentAnimation && 0 === this.event.timer;
                        (a = a || this.data.pass_idle.indexOf(this.sprite.currentAnimation) != -1),
                            a
                                ? this.eventNext()
                                : (0 === this.event.timer && ((this.tmp_idle_start = this.data.to_idle[this.sprite.currentAnimation]), 
                                    (() => {
                                        try {
                                            this.sprite.gotoAndPlay(this.tmp_idle_start);
                                        } catch (e) {
                                            console.error("Idle animation error, falling back to jew:", e);
                                            this.color = "jew";
                                            this.userPublic.color = "jew";
                                            this.updateSprite();
                                            return;
                                        }
                                    })(), (this.event.timer = 1)),
                                    this.tmp_idle_start != this.sprite.currentAnimation && "idle" == this.sprite.currentAnimation && this.eventNext(),
                                    (BonziHandler.needsUpdate = !0));
                    },
                },
                {
                    key: "updateRandom",
                    value: function () {
                        var a = this.event.cur().add,
                            b = Math.floor(a.length * this.rng()),
                            c = this.eventMake(a[b]);
                        this.eventNext(), this.eventQueue.unshift(c);
                    },
                },
                {
                    key: "update",
                    value: function () {
                        //OK solution as long as no real color starts with "http"
                        if (this.color.startsWith("http")) {
                            //Set canvas bg to the crosscolor as easel.js itself cant handle cors
                            this.$canvas.css("background-image", 'url("' + this.color + '")');
                            this.$canvas.css("background-position-x", -Math.floor(this.sprite.currentFrame % 17) * this.data.size.x + 'px');
                            this.$canvas.css("background-position-y", -Math.floor(this.sprite.currentFrame / 17) * this.data.size.y + 'px');
                        } else this.$canvas.css("background-image", 'none');

                        //For tagged people
                        if (this.userPublic.tagged) {
                            //Add one if it doesnt exist
                            if (this.offtag == undefined) {
                                $("#bonzi_" + this.id).append("<div id='tag_" + this.id + "' class='official_tag'><b><i>" + this.userPublic.tag + "</i></b></div>")
                                this.offtag = $("#tag_" + this.id);
                            }
                            //Update if it exists
                            else {
                                this.offtag.html("<b><i>" + this.userPublic.tag + "</i></b>")
                            }
                        }
                        //Remove if they're not tagged but still have a tag
                        else if (this.offtag != undefined) {
                            this.offtag.remove();
                            this.offtag = undefined;
                        }
                        if (this.run) {
                            if (
                                (0 !== this.eventQueue.length && this.eventQueue[0].index >= this.eventQueue[0].list.length && this.eventQueue.splice(0, 1), (this.event = this.eventQueue[0]), 0 !== this.eventQueue.length && this.eventRun)
                            ) {
                                var a = this.event.cur().type;
                                try {
                                    this[this.eventTypeToFunc[a]]();
                                } catch (b) {
                                    this.event.index++;
                                }
                            }
                            this.willCancel && (this.cancel(), (this.willCancel = !1)), this.needsUpdate && (this.stage.update(), (this.needsUpdate = !1));
                        }
                    },
                },
                {
                    key: "eventNext",
                    value: function () {
                        (this.event.timer = 0), (this.event.index += 1);
                    },
                },
                {
                    key: "talk",
                    value: function (a, b, c) {
                        var d = this;
                        var toscroll = document.getElementById("logcontent").scrollHeight - document.getElementById("logcontent").scrollTop < 605;
                        (c = c || !1),
                            (a = replaceAll(a, "{NAME}", this.userPublic.name)),
                            (a = replaceAll(a, "{COLOR}", this.color)),
                            "undefined" != typeof b ? ((b = replaceAll(b, "{NAME}", this.userPublic.name)), (b = replaceAll(b, "{COLOR}", this.color))) : (b = a.replace("&gt;", "")),

                            //document.getElementById("logcontent").innerHTML += "<p><font color='"+this.userPublic.color+"'>"+this.userPublic.name+": </font>"+a+"</p>";
                            document.getElementById("logcontent").insertAdjacentHTML("beforeend", "<p><font color='" + this.userPublic.color + "'>" + this.userPublic.name + ": </font>" + a + "</p>");
                        if (toscroll) document.getElementById("logcontent").scrollTop = document.getElementById("logcontent").scrollHeight;

                        (b = replaceAll(b, "&apos;", "")),
                            (b = replaceAll(b, "&quot;", " quote ")),
                            (b = replaceAll(b, "&amp;", " and ")),
                            (b = replaceAll(b, "&#91;", ""));

                        if (!a.startsWith("<img class='userimage'") && !a.startsWith("<video class='uservideo'")) a = linkify(a);

                        else b = "-e";

                        ignorehtml.forEach((toignore) => {
                            b = replaceAll(b, "<" + toignore + ">", "")
                            b = replaceAll(b, "</" + toignore + ">", "")
                        });


                        var e = "&gt;" == a.substring(0, 4) || ">" == a[0];
                        this.$dialogCont[c ? "html" : "text"](a)[e ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block"),
                            this.stopSpeaking(),
                            (this.goingToSpeak = !0),
                            speak.play(
                                b,
                                { pitch: this.userPublic.pitch, speed: this.userPublic.speed },
                                function () {
                                    d.clearDialog();
                                },
                                function (a) {
                                    d.goingToSpeak || a.stop(), (d.voiceSource = a);
                                }
                            );
                    },
                },
                {
                    key: "joke",
                    value: function () {
                        this.runSingleEvent(this.data.event_list_joke);
                    },
                },
                {
                    key: "fact",
                    value: function () {
                        this.runSingleEvent(this.data.event_list_fact);
                    },
                },
                {
                    key: "exit",
                    value: function (a) {
                        this.runSingleEvent([{ type: "anim", anim: "surf_away", ticks: 30 }]), setTimeout(a, 2e3);
                    },
                },
                {
                    key: "deconstruct",
                    value: function () {
                        this.stopSpeaking(), BonziHandler.stage.removeChild(this.sprite), (this.run = !1), this.$element.remove();
                    },
                },
                {
                    key: "updateName",
                    value: function () {
                        const lockIcon = this.userPublic.hasLock ? ' [LOCKED]' : '';
                        const ringIcon = this.userPublic.hasRingDoorbell ? ' [RING]' : '';
                        const vetoIcon = this.userPublic.hasVetoPower ? ' [VETO POWER]' : '';
                        const broomTag = this.userPublic.hasBroom ? ' [I bought a broom]' : '';
                        this.$nametag.html(this.userPublic.name + this.userPublic.typing + lockIcon + ringIcon + vetoIcon + broomTag);
                    },
                },
                {
                    key: "youtube",
                    value: function (a) {
                        if (!this.mute) {
                            var b = "iframe";
                            this.$dialogCont.html(
                                "\n\t\t\t\t\t<" +
                                b +
                                ' type="text/html" width="173" height="173" \n\t\t\t\t\tsrc="https://www.youtube.com/embed/' +
                                a +
                                '?autoplay=1" \n\t\t\t\t\tstyle="width:173px;height:173px"\n\t\t\t\t\tframeborder="0"\n\t\t\t\t\tallowfullscreen="allowfullscreen"\n\t\t\t\t\tmozallowfullscreen="mozallowfullscreen"\n\t\t\t\t\tmsallowfullscreen="msallowfullscreen"\n\t\t\t\t\toallowfullscreen="oallowfullscreen"\n\t\t\t\t\twebkitallowfullscreen="webkitallowfullscreen"\n\t\t\t\t\t></' +
                                b +
                                ">\n\t\t\t\t"
                            ),
                                this.$dialog.show();
                        }
                        return this;
                    },
                },
                {
                    key: "backflip",
                    value: function (a) {
                        var b = [{ type: "anim", anim: "backflip", ticks: 15 }];
                        a && (b.push({ type: "anim", anim: "cool_fwd", ticks: 30 }), b.push({ type: "idle" })), this.runSingleEvent(b);
                    },
                },
                {
                    key: "updateDialog",
                    value: function () {
                        var a = this.maxCoords();
                        this.data.size.x + this.$dialog.width() > a.x
                            ? this.y < this.$container.height() / 2 - this.data.size.x / 2
                                ? this.$dialog.removeClass("bubble-top").removeClass("bubble-left").removeClass("bubble-right").addClass("bubble-bottom")
                                : this.$dialog.removeClass("bubble-bottom").removeClass("bubble-left").removeClass("bubble-right").addClass("bubble-top")
                            : this.x < this.$container.width() / 2 - this.data.size.x / 2
                                ? this.$dialog.removeClass("bubble-left").removeClass("bubble-top").removeClass("bubble-bottom").addClass("bubble-right")
                                : this.$dialog.removeClass("bubble-right").removeClass("bubble-top").removeClass("bubble-bottom").addClass("bubble-left");
                    },
                },
                {
                    key: "maxCoords",
                    value: function () {
                        return { x: this.$container.width() - this.data.size.x, y: this.$container.height() - this.data.size.y - $("#chat_bar").height() };
                    },
                },
                {
                    key: "asshole",
                    value: function (a) {
                        this.runSingleEvent([{ type: "text", text: "Hey, " + a + "!" }, { type: "text", text: "You're a fucking asshole!", say: "your a fucking asshole!" }, { type: "anim", anim: "grin_fwd", ticks: 15 }, { type: "idle" }]);
                    },
                },
                {
                    key: "owo",
                    value: function (a) {
                        this.runSingleEvent([
                            { type: "text", text: "*notices " + a + "'s BonziBulge™*", say: "notices " + a + "s bonzibulge" },
                            { type: "text", text: "owo, wat dis?", say: "oh woah, what diss?" },
                        ]);
                    },
                },
                {
                    key: "updateSprite",
                    value: async function(isGone = false) {
                        const stage = BonziHandler.stage;
                        this.cancel();
                        
                        try {
                            const spriteSheet = await BonziSprites.get(this.color);
                            if (this.sprite) {
                                stage.removeChild(this.sprite);
                            }
                            this.sprite = new createjs.Sprite(spriteSheet, isGone ? "gone" : "idle");
                            stage.addChild(this.sprite);
                            this.move();
                        } catch (err) {
                            console.error("Failed to update sprite:", err);
                            // Fallback to jew if something goes wrong
                            this.color = "jew";
                            this.userPublic.color = "jew";
                            const fallbackSheet = BonziSprites.get("jew");
                            if (!this.sprite) {
                                this.sprite = new createjs.Sprite(fallbackSheet, isGone ? "gone" : "idle");
                                stage.addChild(this.sprite);
                            }
                            this.move();
                        }
                    },
                },
            ]),
            a
        );
    })(),
    BonziData = {
        size: { x: 200, y: 160 },
        sprite: {
            frames: { width: 200, height: 160 },
            animations: {
                idle: 0,
                surf_across_fwd: [1, 8, "surf_across_still", 1],
                surf_across_still: 9,
                surf_across_back: { frames: range(8, 1), next: "idle", speed: 1 },
                clap_fwd: [10, 12, "clap_still", 1],
                clap_still: [13, 15, "clap_still", 1],
                clap_back: { frames: range(12, 10), next: "idle", speed: 1 },
                surf_intro: [277, 302, "idle", 1],
                surf_away: [16, 38, "gone", 1],
                gone: 39,
                shrug_fwd: [40, 50, "shrug_still", 1],
                shrug_still: 50,
                shrug_back: { frames: range(50, 40), next: "idle", speed: 1 },
                earth_fwd: [51, 57, "earth_still", 1],
                earth_still: [58, 80, "earth_still", 1],
                earth_back: [81, 86, "idle", 1],
                look_down_fwd: [87, 90, "look_down_still", 1],
                look_down_still: 91,
                look_down_back: { frames: range(90, 87), next: "idle", speed: 1 },
                lean_left_fwd: [94, 97, "lean_left_still", 1],
                lean_left_still: 98,
                lean_left_back: { frames: range(97, 94), next: "idle", speed: 1 },
                beat_fwd: [101, 103, "beat_still", 1],
                beat_still: [104, 107, "beat_still", 1],
                beat_back: { frames: range(103, 101), next: "idle", speed: 1 },
                cool_fwd: [108, 124, "cool_still", 1],
                cool_still: 125,
                cool_back: { frames: range(124, 108), next: "idle", speed: 1 },
                cool_right_fwd: [126, 128, "cool_right_still", 1],
                cool_right_still: 129,
                cool_right_back: { frames: range(128, 126), next: "idle", speed: 1 },
                cool_left_fwd: [131, 133, "cool_left_still", 1],
                cool_left_still: 134,
                cool_left_back: { frames: range(133, 131), next: "cool_still", speed: 1 },
                cool_adjust: { frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124], next: "cool_still", speed: 1 },
                present_fwd: [137, 141, "present_still", 1],
                present_still: 142,
                present_back: { frames: range(141, 137), next: "idle", speed: 1 },
                look_left_fwd: [143, 145, "look_left_still", 1],
                look_left_still: 146,
                look_left_back: { frames: range(145, 143), next: "idle", speed: 1 },
                look_right_fwd: [149, 151, "look_right_still", 1],
                look_right_still: 152,
                look_right_back: { frames: range(151, 149), next: "idle", speed: 1 },
                lean_right_fwd: { frames: range(158, 156), next: "lean_right_still", speed: 1 },
                lean_right_still: 155,
                lean_right_back: [156, 158, "idle", 1],
                praise_fwd: [159, 163, "praise_still", 1],
                praise_still: 164,
                praise_back: { frames: range(163, 159), next: "idle", speed: 1 },
                grin_fwd: [182, 189, "grin_still", 1],
                grin_still: 184,
                grin_back: { frames: range(184, 182), next: "idle", speed: 1 },
                bow_fwd: [224, 232, "bow_still", 1],
                bow_back: { frames: [232, 231, 230, 229, 228, 227, 226, 225, 224], next: "idle", speed: 1 },
                bow_still: 232,
                think_fwd: [242, 247, "think_still", 1],
                think_back: { frames: [247, 246, 245, 244, 243, 242], next: "idle", speed: 1 },
                think_still: 247,
                smile_fwd: [181, 186, "smile_still", 1],
                smile_back: { frames: [186, 185, 184, 183, 182, 181], next: "idle", speed: 1 },
                smile_still: 186,
                backflip: [331, 343, "idle", 1],
            },
        },
        to_idle: {
            surf_across_fwd: "surf_across_back",
            surf_across_still: "surf_across_back",
            clap_fwd: "clap_back",
            clap_still: "clap_back",
            shrug_fwd: "shrug_back",
            shrug_still: "shrug_back",
            earth_fwd: "earth_back",
            earth_still: "earth_back",
            look_down_fwd: "look_down_back",
            look_down_still: "look_down_back",
            lean_left_fwd: "lean_left_back",
            lean_left_still: "lean_left_back",
            beat_fwd: "beat_back",
            beat_still: "beat_back",
            cool_fwd: "cool_back",
            cool_still: "cool_back",
            cool_adjust: "cool_back",
            cool_left_fwd: "cool_left_back",
            cool_left_still: "cool_left_back",
            present_fwd: "present_back",
            present_still: "present_back",
            look_left_fwd: "look_left_back",
            look_left_still: "look_left_back",
            look_right_fwd: "look_right_back",
            look_right_still: "look_right_back",
            lean_right_fwd: "lean_right_back",
            lean_right_still: "lean_right_back",
            praise_fwd: "praise_back",
            praise_still: "praise_back",
            grin_fwd: "grin_back",
            grin_still: "grin_back",
            bow_fwd: "bow_back",
            bow_still: "bow_back",
            think_fwd: "think_back",
            think_still: "think_back",
            smile_fwd: "smile_back",
            smile_still: "smile_back",
            backflip: "idle",
            idle: "idle",
        },
        pass_idle: ["gone"],
        event_list_joke_open: [
            [
                { type: "text", text: "Yeah, of course {NAME} wants me to tell a joke." },
                { type: "anim", anim: "praise_fwd", ticks: 15 },
                { type: "text", text: '"Haha, look at the stupid {COLOR} monkey telling jokes!" Fuck you. It isn\'t funny.', say: "Hah hah! Look at the stupid {COLOR} monkey telling jokes! Fuck you. It isn't funny." },
                { type: "anim", anim: "praise_back", ticks: 15 },
                { type: "text", text: "But I'll do it anyway. Because you want me to. I hope you're happy." },
            ],
            [
                { type: "text", text: "Prepare for something Nazar never heard of" },
                { type: "anim", anim: "praise_fwd", ticks: 15 },
                { type: "text", text: "HUMOUR!" },
                { type: "anim", anim: "praise_back", ticks: 15 },
            ],
            [{ type: "text", text: "{NAME} used /joke. Whoop-dee-fucking doo." }],
            [{ type: "text", text: "{NAME} asked me for jewish comedy." }],
            [{ type: "text", text: "Prepare to be offended." }],
            [{ type: "text", text: "HEY YOU IDIOTS ITS TIME FOR A JOKE" }],
            [
                { type: "text", text: "Wanna hear a joke?" },
                { type: "text", text: "No?" },
                { type: "text", text: "Mute me then. That's your fucking problem." },
            ],
            [
                { type: "text", text: "Hey dude prepare for a joke." },
            ],
            [
                { type: "text", text: "Time to make fun of video." },
            ],
            [
                { type: "text", text: "Die, {NAME}. I'd never entertain you in a heartbeat." },
            ],
            [{ type: "text", text: "Senpai {NAME} wants me to tell a joke." }],
            [{ type: "text", text: "Time for whatever horrible fucking jokes the creator of this site wrote." }],
        ],
        event_list_joke_mid: [
            [
                { type: "text", text: "What is easy to get into, but hard to get out of?" },
                { type: "text", text: "Child support!" },
            ],
            [
                { type: "text", text: "Why do they call HTML HyperText?" },
                { type: "text", text: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
                { type: "anim", anim: "shrug_back", ticks: 15 },
                { type: "text", text: "Sorry. I just had an epiphany of my own sad, sad existence." },
            ],
            [
                {
                    type: "text",
                    text: 'Two sausages are in a pan. One looks at the other and says "Boy it\'s hot in here!" and the other sausage says "Unbelievable! It\'s a talking sausage!"',
                    say: "Two sausages are in a pan. One looks at the other and says, Boy it's hot in here! and the other sausage says, Unbelievable! It's a talking sausage!",
                },
                { type: "anim", anim: "shrug_back", ticks: 15 },
                { type: "text", text: "What were you expecting? A dick joke? You're a sick fuck." },
            ],
            [
                { type: "text", text: "What is in the middle of Paris?" },
                { type: "text", text: "A giant inflatable buttplug." },
            ],
            [
                { type: "text", text: "Why did Fune love cp?" },
                { type: "text", text: "Because I don't like Fune and fune suck! That's the whole joke." },
            ],
            [
                { type: "text", text: "The twin towers didn't do anything that's bad. Except in 1999. Go look that up." },
            ],
            [
                { type: "text", text: "What goes in pink and comes out blue?" },
                { type: "text", text: "Sonic is cool hedgehog" },
            ],
            [
                { type: "text", text: "What type of water won't freeze?" },
                { type: "text", text: "Your mother's." },
            ],
            [
                { type: "text", text: "Who earns a living by driving his customers away?" },
                { type: "text", text: "Nintendo!" },
            ],
            [
                { type: "text", text: "Why did Fune love porn?" },
                { type: "text", text: "because fune suck!" },
            ],
            [
                { type: "text", text: "Humans are like jokes" },
                { type: "text", text: "Not everyone likes the dead ones" },
            ],
            [
                { type: "text", text: "You will never take me down." }
            ],
            [
                { type: "text", text: "Why did fune post NSFW?" },
                { type: "text", text: "Because fune suck!" },
            ],
            [
                { type: "text", text: "What did the digital clock say to the grandfather clock?" },
                { type: "text", text: "Suck my clock." },
            ],
            [
                { type: "text", text: "What do you call a man who shaves 10 times a day?" },
                { type: "text", text: "A woman" },
            ],
            [
                { type: "text", text: "How do you get water in watermelons?" },
                { type: "text", text: "Cum in them." },
            ],
            [
                { type: "text", text: "Why do everyone call money bread?" },
                { type: "text", text: "Because everyone KNEAD it. Haha please send money to my PayPal at nigerianprince99@bonzi.com" },
            ],
            [
                { type: "text", text: "How did 6 meet 7?" },
                { type: "text", text: "67!" },
            ],
            [
                { type: "text", text: "What do you call a gentle(girl or whatever)?" },
                { type: "text", text: "Si-oh ban." },
            ],
            [
                { type: "text", text: "Ok i'il telling jokes" },
                { type: "text", text: "{NAME}" },
            ],
            [
                { type: "text", text: "What did nazar host bonziworld deluxe?" },
                { type: "text", text: "because nazar is cool owner of bw deluxe" },
            ],
            [
                { type: "text", text: "I like KFC, I have coca-cola and I have chicken nuggets Who am I?" },
                { type: "text", text: "A fats!" },
            ],
            [
                { type: "text", text: "How many Germans does it take to change a lightbulb?" },
                { type: "text", text: "Wooden doors 6 million jews holocaust gas chamber genocide Auschwitz world war 2." },
            ],
            [
                { type: "text", text: "Why did the chicken cross the road?" },
                { type: "text", text: "I don't know but jews are probably to blame." },
            ],
            [
                { type: "text", text: "What is a cow that eats grass?" },
                { type: "text", text: "ASS" },
                { type: "text", text: "I'm a comedic genius. I know." },
            ],
            [
                { type: "text", text: "How do you get a girlfriend?" },
                { type: "text", text: "You make love, not war." },
                { type: "text", text: "I'm a comedic genius. I know." },
            ],
        ],
        event_list_joke_end: [
            [
                { type: "text", text: "You know {NAME}, a good friend laughs at your jokes even when they're not so funny." },
                { type: "text", text: "And you fucking like it. Thanks." },
            ],
            [{ type: "text", text: "Where do I come up with these? My ass?" }],
            [
                { type: "text", text: "Do I amuse you, {NAME}? Am I funny? Do I make you laugh?" },
                { type: "text", text: "pls respond", say: "please respond" },
            ],
            [{ type: "text", text: "Maybe I'll keep my day job, {NAME}. Patreon didn't accept me." }],
            [
                { type: "text", text: "Laughter is the best medicine!" },
                { type: "text", text: "Apart from meth." },
            ],
            [
                { type: "text", text: "Now laugh." },
            ],
            [
                { type: "text", text: "Tell that one to your mother." },
            ],
            [
                { type: "text", text: "God i hate minorities so much." },
            ],
            [
                { type: "text", text: "Don't judge me on my sense of humor alone." },
                { type: "text", text: "Help! I'm being oppressed!" },
            ],
        ],
        event_list_fact_open: [[{ type: "html", text: "Hey kids, it's time for a Fun Fact&reg;!", say: "Hey kids, it's time for a Fun Fact!" }]],
        event_list_fact_mid: [
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "Did you know that Uranus is 31,518 miles (50,724 km) in diameter?", say: "Did you know that Yer Anus is 31 thousand 500 and 18 miles in diameter?" },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "did you know swag frenzy made bonziworld server and video." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "YOU run the banks. TO run the bank, BECOME yourself." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "Not all muslims are terrorists." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "Fune manipulates little boys." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "did you know fune is bad owner and pornfag, gorefag, vorefag, and also, bonzi.lol suck!" },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "fune are bad" },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "did you know nazar made project on github and replits" },
                { type: "text", text: "That's Hitler's fault." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "anim", anim: "earth_fwd", ticks: 15 },
                { type: "text", text: "I'd say a fact right now but you should just look at this spinning Earth thing I'm doing right now." },
                { type: "anim", anim: "earth_back", ticks: 15 },
                { type: "anim", anim: "grin_fwd", ticks: 15 },
            ],
            [
                { type: "text", text: "Fun Fact: The skript kiddie of this site didn't bother checking if the text that goes into the dialog box is HTML code." },
                { type: "html", text: "<img src='./img/misc/topjej.png'></img>", say: "toppest jej" },
            ],
        ],
        event_list_fact_end: [[{ type: "text", text: "o gee whilickers! wasn't that sure interesting! huh? " }]],
    };
(BonziData.event_list_joke = [
    { type: "add_random", pool: "event_list_joke_open", add: BonziData.event_list_joke_open },
    { type: "anim", anim: "shrug_fwd", ticks: 15 },
    { type: "add_random", pool: "event_list_joke_mid", add: BonziData.event_list_joke_mid },
    { type: "idle" },
    { type: "add_random", pool: "event_list_joke_end", add: BonziData.event_list_joke_end },
    { type: "idle" },
]),
    (BonziData.event_list_fact = [
        { type: "add_random", pool: "event_list_fact_open", add: BonziData.event_list_fact_open },
        { type: "add_random", pool: "event_list_fact_mid", add: BonziData.event_list_fact_mid },
        { type: "idle" },
        { type: "add_random", pool: "event_list_fact_end", add: BonziData.event_list_fact_end },
        { type: "idle" },
    ]),
    (BonziData.event_list_triggered = [
        { type: "anim", anim: "cool_fwd", ticks: 30 },
        {
            type: "text",
            text: "I sexually identify as BonziBUDDY. Ever since I was a young gorilla I dreamed of invading desktops dropping hot sticky tootorals on disgusting PC users.",
            say: "I sexually identify as BonziBUDDY. Ever since I was a young gorilla I dreamed of invading desktops dropping hot sticky tootorals on disgusting PC users.",
        },
        {
            type: "text",
            text: "People say to me that a person being a BonziBUDDY is impossible and that I'm a fucking virus but I don't care, I'm beautiful.",
            say: "People say to me that a person being a BonziBUDDY is impossible and that I'm a fucking virus but I dont care, I'm beautiful.",
        },
        {
            type: "text",
            text: "I'm having an IT intern install Internet Explorer 6, aquarium screensavers and PC Doctor 2016 on my body. From now on I want you guys to call me 'Joel' and respect my right to meme from above and meme needlessly.",
            say: "I'm having an IT intern install Internet Explorer 6, aquarium screensavers and PC Doctor 2016 on my body. From now on I want you guys to call me Joel and respect my right to meme from above and meme needlessly.",
        },
        {
            type: "text",
            text: "If you can't accept me you're a gorillaphobe and need to check your file permissions. Thank you for being so understanding.",
            say: "If you cant accept me your a gorillaphobe and need to check your file permissions. Thank you for being so understanding.",
        },
        { type: "idle" },
    ]), BonziData.event_list_linux = [{
        type: "text",
        text: "I'd just like to interject for a moment. What you're referring to as Linux, is in fact, BONZI/Linux, or as I've recently taken to calling it, BONZI plus Linux."
    }, {
        type: "text",
        text: "Linux is not an operating system unto itself, but rather another free component of a fully functioning BONZI system made useful by the BONZI corelibs, shell utilities and vital system components comprising a full OS as defined by M.A.L.W.A.R.E."
    }, {
        type: "text",
        text: "Many computer users run a modified version of the BONZI system every day, without realizing it. Through a peculiar turn of events, the version of BONZI which is widely used today is often called 'Linux', and many of its users are not aware that it is basically the BONZI system, developed by the BONZI Project."
    }, {
        type: "text",
        text: "There really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's memes to the other programs that you run. "
    }, {
        type: "text",
        text: "The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system, such as systemd."
    }, {
        type: "text",
        text: "Linux is normally used in combination with the BONZI operating system: the whole system is basically BONZI with Linux added, or BONZI/Linux. All the so-called 'Linux' distributions are really distributions of BONZI/Linux."
    }]


// Initialize sprite manager globally
// window.spriteManager = new SpriteManager();

// Initialize other globals
var hostname = window.location.hostname;
// Create private socket scope with protection
(function() {
    var _socket = io("//" + hostname);
    var _realSocket = {
        emit: function(event, data) {
            _socket.emit(event, data);
        },
        on: function(event, callback) {
            _socket.on(event, callback);
        }
    };

    // Create protected socket interface
    Object.defineProperty(window, '_bonziSocket', {
        get: function() {
            // Get the caller's stack trace
            const stack = new Error().stack || '';
            // If called from console/devtools, stack will contain 'at <anonymous>' or similar
            if (stack.includes('at <anonymous>') || stack.includes('at Object.InjectedScript')) {
                throw new Error('Nice try! Access denied.');
            }
            return _realSocket;
        },
        set: function() {
            throw new Error('Nice try! Access denied.');
        },
        configurable: false,
        enumerable: false
    });
})();
var usersPublic = {};
var bonzis = {};
var usersAmt = 0;
var usersKeys = [];
var debug = false; // Set to false to prevent debug access
var myGuid = null;

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global JavaScript Error:', e.error);
    console.error('Error at line:', e.lineno, 'column:', e.colno);
    console.error('Error in file:', e.filename);
    console.error('Error message:', e.message);
    return false; // Don't prevent default error handling
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

$(window).load(function () {
    try {
        $("#login_card").show();
        $("#login_load").hide();
        
        // Initialize voice chat
        initVoiceChat();
    } catch (error) {
        console.error("Error in window load handler:", error);
    }
    
    // Initialize login form
    $("#login_name").val(cookieobject.namee);
    if (cookieobject.background !== undefined) {
        if (cookieobject.background == "main") {
            $("#bghold").html("");
        } else {
            $("#bghold").html("<img style='top:0;left:0;position:fixed;width:100%;height:100%;z-index:-10;' src='" + cookieobject.background + "'>");
        }
    }

    // Set up touch handlers
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, true);
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);
});

// Set up socket handlers
window._bonziSocket.on("authlv", function (a) {
    authlevel = a.level;
    console.log(a.level);
    
    // If user is a Lower Rabbi (Hanukkah), update UI
    if (a.level === LOWER_RABBI_LEVEL) {
        let lowerRabbiExpiry = checkLowerRabbiCookie();
        if (lowerRabbiExpiry) {
            // Show Hanukkah status
            let expireDisplay = "permanent";
            
            // For timed cookies, calculate remaining time
            if (lowerRabbiExpiry !== "forever" && lowerRabbiExpiry.includes(':')) {
                const timestamp = parseInt(lowerRabbiExpiry.split(':')[0]);
                const now = Date.now();
                const minutesLeft = Math.floor((timestamp - now) / 1000 / 60);
                expireDisplay = minutesLeft + " minutes";
            }
            
            $("#rabbiexpire").html(expireDisplay);
            $("#rabbi").show();
        }
    }
});

$(function () {
    $("#login_go").click(loadTest);
    $("#login_room").val(window.location.hash.slice(1));
    $("#login_name, #login_room").keypress(function (a) {
        if (a.which == 13) login();
    });

    window._bonziSocket.on("ban", function (a) {
        var banReason = "You have been banned from the server.";
        var banAuthority = "An administrator";
        var banDuration = "Until server restart";
        
        // Set ban reason if provided
        if (a.reason) {
            banReason = a.reason;
        }
        
        // Determine who banned based on the ban message
        if (banReason.includes("Higher King")) {
            banAuthority = "A Higher King (Operator)";
        } else if (banReason.includes("Pope")) {
            banAuthority = "The Pope";
        }
        
        // Set ban duration and show appeal info for temporary bans
        if (a.end) {
            var endTime = new Date(a.end);
            var now = new Date();
            var duration = Math.round((endTime - now) / 1000 / 60); // Duration in minutes
            
            if (duration <= 10) {
                banDuration = duration + " minutes";
                $("#ban_appeal").show();
            }
        }
        
        // Update the ban page elements
        $("#ban_reason").text(banReason);
        $("#ban_authority").text(banAuthority);
        $("#ban_duration").text(banDuration);
        
        // Show the ban page
        $("#page_ban").show();
        $("#page_login").hide();
        $("#page_error").hide();
    });

    window._bonziSocket.on("kick", function (a) {
        $("#page_kick").show();
        $("#kick_reason").html(a.reason);
    });

    window._bonziSocket.on("login_error", error => {
        $("#login_card").show();
        $("#login_load").hide();
        $("#login_error").html("ERROR: " + error);
        $("#login_error").show();
    });

    window._bonziSocket.on("errr", error => {
        err = true;
        $("#page_error" + error.code).show();
    });

    window._bonziSocket.on("motd", mcontents => {
        if (cookieobject.motd != mcontents.id && mcontents.id != 0) {
            console.log(mcontents.id);
            console.log(cookieobject.motd);
            cookieobject.motd = mcontents.id;
            compilecookie();
            $("#motdcontent").html(mcontents.content);
            $("#motd").show();
        }
    });

    window._bonziSocket.on("rabbi", expires => {
        let expiretime = expires;
        if (expiretime > 60) {
            expiretime = Math.floor(expiretime / 60) + " hours " + expiretime % 60;
        }
        
        // Set rabbi-id cookie with expiration
        let date = new Date();
        date.setMinutes(date.getMinutes() + expires);
        document.cookie = "rabbi-id=true; expires=" + date.toUTCString() + "; path=/";
        
        $("#rabbiexpire").html(expiretime + " minutes");
        $("#rabbi").show();
    });

    // Check for existing rabbi cookie on load
    checkRabbiCookie,
    // Check rabbi status on page load
    $(document).ready(function() {
        checkRabbiCookie();
    }),
    window._bonziSocket.on("disconnect", function (a) {
        if (err == false) errorFatal();
    }),
    
    // Add tile button functionality
    $("#btn_tile").click(function () {
        var a = $(window).width(),
            b = $(window).height(),
            c = 0,
            d = 80,
            e = 0,
            f = 0;
        
        for (var g = 0; g < usersAmt; g++) {
            var h = usersKeys[g];
            if (bonzis[h]) {
                bonzis[h].move(e, f);
                e += 200;
                if (e + 100 > a) {
                    e = 0;
                    f += 160;
                    if (f + 160 > b) {
                        c += d;
                        d /= 2;
                        f = c;
                    }
                }
            }
        }
    });
});

// Voice chat functionality with error handling
let voiceChat = {
    mediaRecorder: null,
    audioStream: null,
    isRecording: false,
    isEnabled: false,
    activeUser: null, // Track currently active VC user
    isMobile: false // Track if we're on mobile
};

function initVoiceChat() {
    try {
        // Check if browser supports voice chat
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log("Voice chat not supported in this browser");
            return;
        }
        
        // Check if mobile
        voiceChat.isMobile = window.innerWidth <= 768;
        
        // Set up mobile VC button
        const mobileVcBtn = document.getElementById("mobile_vc_btn");
        if (mobileVcBtn) {
            // Remove old click handler
            mobileVcBtn.removeEventListener("click", null);
            
            // Add press-and-hold handlers
            mobileVcBtn.addEventListener("mousedown", function() {
                startVoiceRecording();
                mobileVcBtn.textContent = "Stop VC";
            });
            
            mobileVcBtn.addEventListener("mouseup", function() {
                stopVoiceRecording();
                mobileVcBtn.textContent = "Start VC";
            });
            
            // Add touch handlers for mobile
            mobileVcBtn.addEventListener("touchstart", function(e) {
                e.preventDefault(); // Prevent mousedown from firing
                startVoiceRecording();
                mobileVcBtn.textContent = "Stop VC";
            });
            
            mobileVcBtn.addEventListener("touchend", function(e) {
                e.preventDefault(); // Prevent mouseup from firing
                stopVoiceRecording();
                mobileVcBtn.textContent = "Start VC";
            });
            
            // Handle cases where user moves finger/mouse off button
            mobileVcBtn.addEventListener("mouseleave", function() {
                if (voiceChat.isRecording) {
                    stopVoiceRecording();
                    mobileVcBtn.textContent = "Start VC";
                }
            });
            
            mobileVcBtn.addEventListener("touchcancel", function(e) {
                e.preventDefault();
                if (voiceChat.isRecording) {
                    stopVoiceRecording();
                    mobileVcBtn.textContent = "Start VC";
                }
            });
            
            // Show button if on mobile
            if (voiceChat.isMobile) {
                mobileVcBtn.style.setProperty('display', 'block', 'important');
            }
        }
        
        // Request microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                voiceChat.audioStream = stream;
                voiceChat.isEnabled = true;
                if (!voiceChat.isMobile) {
                    console.log("Voice chat enabled - hold 'V' to talk");
                }
            })
            .catch(err => {
                console.log("Microphone access denied:", err);
            });

        // Set up mobile VC button handler
        if (voiceChat.isMobile) {
            const vcBtn = document.getElementById('mobile_vc_btn');
            if (vcBtn) {
                vcBtn.addEventListener('click', function() {
                    if (!voiceChat.isRecording) {
                        startVoiceRecording();
                        vcBtn.textContent = 'Stop VC';
                    } else {
                        stopVoiceRecording();
                        vcBtn.textContent = 'Start VC';
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error initializing voice chat:", error);
    }
}

// Voice chat key handlers with error handling
$(document).keydown(function(e) {
    try {
        if (!voiceChat.isMobile && e.key.toLowerCase() === 'v' && !voiceChat.isRecording && voiceChat.isEnabled && voiceChat.audioStream) {
            startVoiceRecording();
        }
    } catch (error) {
        console.error("Error in keydown handler:", error);
    }
});

$(document).keyup(function(e) {
    try {
        if (!voiceChat.isMobile && e.key.toLowerCase() === 'v' && voiceChat.isRecording) {
            stopVoiceRecording();
        }
    } catch (error) {
        console.error("Error in keyup handler:", error);
    }
});

function startVoiceRecording() {
    try {
        if (!voiceChat.audioStream) return;
        
        // Check if someone else is already using VC
        if (voiceChat.activeUser && voiceChat.activeUser !== window._bonziSocket.id) {
            alert("Someone else is already using voice chat. Please wait for them to finish.");
            return;
        }
        
        voiceChat.isRecording = true;
        voiceChat.activeUser = window._bonziSocket.id;
        voiceChat.recordingStartTime = Date.now();
        
        // Use lower quality settings to reduce lag
        const options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000
        };
        
        try {
            voiceChat.mediaRecorder = new MediaRecorder(voiceChat.audioStream, options);
        } catch (e) {
            console.log("Opus not supported, using default codec");
            voiceChat.mediaRecorder = new MediaRecorder(voiceChat.audioStream);
        }
        
        let audioChunks = [];
        voiceChat.mediaRecorder.ondataavailable = event => {
            try {
                audioChunks.push(event.data);
            } catch (error) {
                console.error("Error handling audio data:", error);
            }
        };
        
        voiceChat.mediaRecorder.onstop = () => {
            try {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                if (audioBlob.size > 1024 * 1024) {
                    console.log("Audio too large, not sending");
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const audioData = reader.result;
                        const duration = Date.now() - voiceChat.recordingStartTime;
                        window._bonziSocket.emit("voiceChat", { 
                            audio: audioData,
                            duration: Math.min(duration + 500, 10000)
                        });
                    } catch (error) {
                        console.error("Error sending voice data:", error);
                    }
                };
                reader.onerror = () => {
                    console.error("Error reading audio file");
                };
                reader.readAsDataURL(audioBlob);
            } catch (error) {
                console.error("Error processing audio:", error);
            }
        };
        
        voiceChat.mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            voiceChat.isRecording = false;
            voiceChat.activeUser = null;
        };
        
        voiceChat.mediaRecorder.start();
        console.log("Recording voice...");
    } catch (error) {
        console.error("Error starting voice recording:", error);
        voiceChat.isRecording = false;
        voiceChat.activeUser = null;
    }
}

function stopVoiceRecording() {
    try {
        if (voiceChat.mediaRecorder && voiceChat.isRecording) {
            voiceChat.mediaRecorder.stop();
            voiceChat.isRecording = false;
            voiceChat.activeUser = null;
            console.log("Voice recording stopped");
        }
    } catch (error) {
        console.error("Error stopping voice recording:", error);
        voiceChat.isRecording = false;
        voiceChat.activeUser = null;
    }
}

// Add handler for voice chat status updates
window._bonziSocket.on("voiceStatus", function(data) {
    if (data.activeUser) {
        voiceChat.activeUser = data.activeUser;
    } else {
        voiceChat.activeUser = null;
    }
});

// ... rest of existing code ...

// Initialize BonziHandler
$(document).ready(function () {
    window.BonziHandler = new (function () {
        return (
            (this.framerate = 1 / 15),
            (this.$canvas = $("#bonzi_canvas")),
            (this.stage = new createjs.StageGL(this.$canvas[0], { transparent: !0 })),
            (this.stage.tickOnUpdate = !1),
            (this.resizeCanvas = function () {
                var a = this.$canvas.width(),
                    b = this.$canvas.height();
                this.$canvas.attr({ width: this.$canvas.width(), height: this.$canvas.height() }), 
                this.stage.updateViewport(a, b), 
                (this.needsUpdate = !0);
                
                for (var c = 0; c < usersAmt; c++) {
                    var d = usersKeys[c];
                    if (bonzis[d]) bonzis[d].move();
                }
            }),
            this.resizeCanvas(),
            (this.resize = function () {
                setTimeout(this.resizeCanvas.bind(this), 1);
            }),
            (this.needsUpdate = !0),
            (this.intervalHelper = setInterval(
                function () {
                    this.needsUpdate = !0;
                }.bind(this),
                1e3
            )),
            (this.intervalTick = setInterval(
                function () {
                    if (usersKeys && usersKeys.length) {
                        for (var a = 0; a < usersAmt; a++) {
                            var b = usersKeys[a];
                            if (bonzis[b] && typeof bonzis[b].update === 'function') {
                                try {
                                    bonzis[b].update();
                                } catch (e) {
                                    console.error("Failed to update bonzi:", b, e);
                                }
                            }
                        }
                    }
                    this.stage.tick();
                }.bind(this),
                1e3 * this.framerate
            )),
            (this.intervalMain = setInterval(
                function () {
                    this.needsUpdate && (this.stage.update(), (this.needsUpdate = !1));
                }.bind(this),
                1e3 / 60
            )),
            $(window).resize(this.resize.bind(this)),
            (this.bonzisCheck = function () {
                for (var a = 0; a < usersAmt; a++) {
                    var b = usersKeys[a];
                    if (b in bonzis) {
                        var c = bonzis[b];
                        if (c && c.userPublic) {
                            c.userPublic = usersPublic[b];
                            c.updateName();
                            var d = usersPublic[b].color;
                            c.color != d && ((c.color = d), c.updateSprite());
                        }
                    } else {
                        try {
                            bonzis[b] = new Bonzi(b, usersPublic[b]);
                        } catch (e) {
                            console.error("Failed to create bonzi:", b, e);
                            // Try to create with jew color as fallback
                            try {
                                let fallbackUser = {...usersPublic[b]};
                                fallbackUser.color = "jew";
                                bonzis[b] = new Bonzi(b, fallbackUser);
                            } catch (e2) {
                                console.error("Failed to create fallback bonzi:", b, e2);
                            }
                        }
                    }
                }
            }),
            this
        );
    })();
});

// Initialize socket with proper scope
(function(window) {
    // Private socket instance
    var _socket = io("//" + window.location.hostname);
    
    // Public interface
    window._bonziSocket = _socket;
})(window);


}

// Move checkRabbiCookie function to global scope
function checkRabbiCookie() {
    let rabbiCookie = document.cookie.split(';').find(c => c.trim().startsWith('rabbi-id='));
    if (rabbiCookie) {
        // Extract expiration from cookie
        let cookieExpiry = new Date(document.cookie.split(';').find(c => c.trim().startsWith('rabbi-id=')).split('=')[2]);
        let now = new Date();
        let minutesLeft = Math.floor((cookieExpiry - now) / 1000 / 60);
        
        if (minutesLeft > 0) {
            // Show rabbi status with remaining time
            $("#rabbiexpire").html(minutesLeft + " minutes");
            $("#rabbi").show();
        } else {
            // Cookie expired, remove it
            document.cookie = "rabbi-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
    }
}

function checkLowerRabbiCookie() {
    let name = "LowerRabbiAuth=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            const cookieValue = c.substring(name.length, c.length);
            
            // Just return the full cookie value - server will handle verification
            return cookieValue;
        }
    }
    return "";
}

function confirmHanukkah() {
    if (pendingHanukkahTarget && pendingHanukkahDuration) {
        window._bonziSocket.emit("command", { 
            list: ["hanukkahify", pendingHanukkahTarget, pendingHanukkahDuration] 
        });
    }
    $("#hanukkah_confirm").hide();
    pendingHanukkahTarget = null;
    pendingHanukkahDuration = null;
}

