/* ================================================================
   VARIABLES GLOBALES
================================================================ */
let achievementsData = [];
let userAchievements = [];
let originalAchievementsData = [];
let displayedAchievements = [];
let currentPopupIndex = 0;
let showLocked = true;
let isSortedByRarity = false;

// ================================================================
// CONFIG TWITCH
// ================================================================
const TWITCH_CLIENT_ID = "eid0ebwtlz36hkbmvv191rxj3ba7c4";
const TWITCH_REDIRECT_URI = "https://mickuu.github.io/twitch-trophies/";
const TWITCH_STORAGE_KEY = "twitchUser";

// ================================================================
// CONFIG FIREBASE
// ================================================================
const FIREBASE_URL = "https://succes-twitch-default-rtdb.europe-west1.firebasedatabase.app/user_achievements.json";

document.addEventListener("DOMContentLoaded", () => {
    setupTwitchAuthUI();
    restoreTwitchUserFromStorage();
    handleTwitchRedirect();
});

/* ================================================================
   CHARGEMENT DES DONNÉES
================================================================ */

// Charger un CSV générique
async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    const rows = text
        .trim()
        .split("\n")
        .map((row) => row.split(","));
    const headers = rows.shift();

    return rows.map((row) => {
        let obj = {};
        headers.forEach((h, i) => (obj[h.trim()] = row[i] ? row[i].trim() : ""));
        return obj;
    });
}

// Charger les succès utilisateurs depuis Firebase
async function loadUserAchievementsFromFirebase() {
    const response = await fetch(FIREBASE_URL);
    const data = await response.json();
    console.log("Raw Firebase data:", data);

    const result = [];
    for (const pseudo in data) {
        for (const id in data[pseudo]) {
            if (data[pseudo][id] === true) {
                result.push({ pseudo, id });
            }
        }
    }
    console.log("Parsed result:", result);
    return result;
}

// Charger les succès et lier à l'utilisateur
async function loadAchievements() {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Entrez un pseudo Twitch !");
        return;
    }

    achievementsData = await loadCSV("achievements.csv");
    userAchievements = await loadUserAchievementsFromFirebase();

    // Sauvegarde de l'ordre initial
    originalAchievementsData = [...achievementsData];

    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);

    displayAchievements(obtained);
    document.getElementById("main-progress").style.display = "block";
}

/* ================================================================
   AFFICHAGE DES SUCCÈS
================================================================ */
console.log("userAchievements:", userAchievements);
console.log("obtained:", obtained);

function displayAchievements(obtained) {
    const container = document.getElementById("achievements");
    container.innerHTML = "";
    let unlockedCount = 0;

    displayedAchievements = [];

    achievementsData.forEach((achievement, index) => {
        const isUnlocked = obtained.includes(achievement.id);
        if (!isUnlocked && !showLocked) return;

        if (isUnlocked) unlockedCount++;

        const div = document.createElement("div");
        div.classList.add("achievement");
        if (!isUnlocked) div.classList.add("locked");

        const inner = document.createElement("div");
        inner.classList.add("achievement-inner");
        inner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;
        div.appendChild(inner);

        const desc = document.createElement("p");
        desc.textContent = achievement.description || "";
        desc.classList.add("achievement-desc");

        const rarity = achievement.rarity?.toLowerCase() || "";
        if (rarity.includes("commun")) desc.classList.add("common");
        else if (rarity.includes("rare")) desc.classList.add("rare");
        else if (rarity.includes("épique")) desc.classList.add("epic");
        else if (rarity.includes("légendaire")) desc.classList.add("legendary");

        div.appendChild(desc);

        if (isUnlocked) {
            displayedAchievements.push(achievement);
            div.addEventListener("click", () => showPopup(achievement));
        }

        container.appendChild(div);

        setTimeout(() => {
            div.style.opacity = 1;
        }, index * 50);
    });

    updateProgress(unlockedCount, achievementsData.length);
}

/* ================================================================
   RESET AFFICHAGE SUCCÈS (déconnexion)
================================================================ */
function clearAchievementsDisplay() {
    const container = document.getElementById("achievements");
    if (container) {
        container.innerHTML = "";

        const placeholder = document.createElement("p");
        placeholder.classList.add("achievements-placeholder");
        placeholder.textContent = "Connecte-toi avec Twitch pour voir tes succès débloqués.";
        container.appendChild(placeholder);
    }

    const circle = document.querySelector(".progress-ring-bar");
    const text = document.getElementById("progress-counter");

    if (circle && text) {
        const radius = 65;
        const circumference = 2 * Math.PI * radius;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;
        const total = achievementsData && achievementsData.length ? achievementsData.length : 0;
        text.textContent = `0 / ${total}`;
    }

    const mainProgress = document.getElementById("main-progress");
    if (mainProgress) mainProgress.style.display = "none";

    displayedAchievements = [];
}

/* ================================================================
   MISE À JOUR PROGRESSION
================================================================ */
function updateProgress(unlocked, total) {
    updateCircularProgress(unlocked, total);
}

function updateCircularProgress(unlocked, total) {
    const circle = document.querySelector(".progress-ring-bar");
    const text = document.getElementById("progress-counter");

    if (!circle || !text) return;

    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (unlocked / total) * circumference;

    circle.style.strokeDashoffset = offset;
    text.textContent = `${unlocked} / ${total}`;
}

/* ================================================================
   POPUP : AFFICHAGE + NAVIGATION
================================================================ */
function showPopup(achievement) {
    currentPopupIndex = displayedAchievements.findIndex(
        (a) => a.id === achievement.id
    );
    updatePopupContent(achievement);
    document.getElementById("popup").classList.add("visible");
}

function hidePopup() {
    document.getElementById("popup").classList.remove("visible");
}

function updatePopupContent(achievement) {
    const popupInner = document.getElementById("popup-inner");
    const popupDescription = document.getElementById("popup-description");
    const popupAchievement = document.querySelector(".popup-achievement");

    const found = achievementsData.find((a) => a.id === achievement.id);
    const description = achievement.description || found?.description || "Pas de description disponible";
    const rarity = achievement.rarity?.toLowerCase() || "";

    popupInner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;
    popupDescription.className = "";

    if (rarity.includes("commun")) popupDescription.classList.add("common");
    else if (rarity.includes("rare")) popupDescription.classList.add("rare");
    else if (rarity.includes("épique")) popupDescription.classList.add("epic");
    else if (rarity.includes("légendaire")) popupDescription.classList.add("legendary");

    popupDescription.textContent = description;

    popupAchievement.classList.remove("common", "rare", "epic", "legendary");

    if (rarity.includes("commun")) popupAchievement.classList.add("common");
    else if (rarity.includes("rare")) popupAchievement.classList.add("rare");
    else if (rarity.includes("épique")) popupAchievement.classList.add("epic");
    else if (rarity.includes("légendaire")) popupAchievement.classList.add("legendary");
}

function navigatePopup(direction) {
    const popupContent = document.getElementById("popup-content");

    const outClass = direction > 0 ? "slide-out-left" : "slide-out-right";
    const inClass = direction > 0 ? "slide-in-right" : "slide-in-left";

    popupContent.classList.add(outClass);

    popupContent.addEventListener("animationend", function handler() {
        popupContent.classList.remove(outClass);
        popupContent.removeEventListener("animationend", handler);

        currentPopupIndex += direction;
        if (currentPopupIndex < 0) currentPopupIndex = displayedAchievements.length - 1;
        if (currentPopupIndex >= displayedAchievements.length) currentPopupIndex = 0;

        updatePopupContent(displayedAchievements[currentPopupIndex]);

        popupContent.classList.add(inClass);
        popupContent.addEventListener("animationend", function handler2() {
            popupContent.classList.remove(inClass);
            popupContent.removeEventListener("animationend", handler2);
        });
    });
}

/* ================================================================
   FILTRES ET TRI
================================================================ */
function toggleLocked() {
    showLocked = !showLocked;
    const button = document.getElementById("lockButton");
    button.textContent = showLocked ? "Masquer les non-obtenus" : "Montrer les non-obtenus";

    const username = document.getElementById("username").value.trim();
    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);

    displayAchievements(obtained);
}

function toggleSortByRarity() {
    const button = document.getElementById("sortButton");

    if (!isSortedByRarity) {
        const rarityOrder = {
            commun: 1,
            rare: 2,
            épique: 3,
            legendaire: 4,
            légendaire: 4,
        };

        achievementsData.sort((a, b) => {
            const rA = rarityOrder[a.rarity?.toLowerCase()] || 0;
            const rB = rarityOrder[b.rarity?.toLowerCase()] || 0;
            return rA - rB;
        });

        isSortedByRarity = true;
        button.textContent = "Trier par défaut";
    } else {
        achievementsData = [...originalAchievementsData];
        isSortedByRarity = false;
        button.textContent = "Trier par rareté";
    }

    const username = document.getElementById("username").value.trim();
    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);

    displayAchievements(obtained);
}

// ================================================================
// CONNEXION / DECONNEXION TWITCH (Implicit OAuth Flow)
// ================================================================

function setupTwitchAuthUI() {
    const loginBtn = document.getElementById("twitch-login-btn");
    const logoutBtn = document.getElementById("twitch-logout-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const url = new URL("https://id.twitch.tv/oauth2/authorize");
            url.searchParams.set("client_id", TWITCH_CLIENT_ID);
            url.searchParams.set("redirect_uri", TWITCH_REDIRECT_URI);
            url.searchParams.set("response_type", "token");
            url.searchParams.set("scope", "");
            window.location.href = url.toString();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem(TWITCH_STORAGE_KEY);

            const label = document.getElementById("current-user-label");
            if (label) label.textContent = "";

            const usernameInput = document.getElementById("username");
            if (usernameInput) usernameInput.value = "";

            setAuthButtonsState(false);
            clearAchievementsDisplay();
        });
    }
}

function setAuthButtonsState(isLoggedIn) {
    const loginBtn = document.getElementById("twitch-login-btn");
    const logoutBtn = document.getElementById("twitch-logout-btn");

    if (isLoggedIn) {
        if (loginBtn) loginBtn.classList.add("hidden");
        if (logoutBtn) logoutBtn.classList.remove("hidden");
    } else {
        if (loginBtn) loginBtn.classList.remove("hidden");
        if (logoutBtn) logoutBtn.classList.add("hidden");
    }
}

async function handleTwitchRedirect() {
    if (window.location.hash && window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");

        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        if (accessToken) {
            const user = await fetchTwitchUser(accessToken);
            if (user) {
                onTwitchUserLoggedIn(user);
            }
        }
    }
}

function restoreTwitchUserFromStorage() {
    const stored = localStorage.getItem(TWITCH_STORAGE_KEY);
    if (!stored) {
        setAuthButtonsState(false);
        return;
    }

    try {
        const data = JSON.parse(stored);
        if (data && data.login) {
            const fakeUser = {
                login: data.login,
                display_name: data.displayName || data.login,
            };
            onTwitchUserLoggedIn(fakeUser, { skipSave: true, autoLoad: true });
        } else {
            setAuthButtonsState(false);
        }
    } catch (e) {
        console.error("Erreur restoreTwitchUserFromStorage:", e);
        setAuthButtonsState(false);
    }
}

function onTwitchUserLoggedIn(user, options) {
    const opts = Object.assign({ skipSave: false, autoLoad: true }, options || {});
    const login = user.login;
    const displayName = user.display_name || login;

    if (!opts.skipSave) {
        localStorage.setItem(TWITCH_STORAGE_KEY, JSON.stringify({ login, displayName }));
    }

    const label = document.getElementById("current-user-label");
    if (label) {
        label.textContent = `Connecté en tant que ${displayName} (@${login})`;
    }

    const usernameInput = document.getElementById("username");
    if (usernameInput) {
        usernameInput.value = login;
    }

    setAuthButtonsState(true);

    if (opts.autoLoad && typeof loadAchievements === "function") {
        loadAchievements();
    }
}

async function fetchTwitchUser(accessToken) {
    try {
        const res = await fetch("https://api.twitch.tv/helix/users", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Client-Id": TWITCH_CLIENT_ID
            }
        });

        if (!res.ok) {
            console.error("Erreur Twitch API:", res.status, await res.text());
            return null;
        }

        const data = await res.json();
        if (data.data && data.data.length > 0) {
            return data.data[0];
        }
    } catch (err) {
        console.error("Erreur fetchTwitchUser:", err);
    }
    return null;
}

/* ================================================================
   LISTE DES UTILISATEURS
================================================================ */
async function loadUsersList() {
    const data = await loadUserAchievementsFromFirebase();

    const userMap = {};
    data.forEach((u) => {
        if (!userMap[u.pseudo]) userMap[u.pseudo] = 0;
        userMap[u.pseudo]++;
    });

    const userEntries = Object.entries(userMap)
        .filter(([pseudo, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    const usersListDiv = document.getElementById("users-list");
    usersListDiv.innerHTML = "";

    userEntries.forEach(([pseudo, count]) => {
        const div = document.createElement("div");
        div.classList.add("user-card");
        div.textContent = `${pseudo} (${count})`;

        div.addEventListener("click", () => {
            document.getElementById("username").value = pseudo;
            loadAchievements();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        usersListDiv.appendChild(div);
    });
}

/* ================================================================
   INIT
================================================================ */
loadUsersList();