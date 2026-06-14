/* ================================================================
   CONFIGURATION
================================================================ */
const TWITCH_CLIENT_ID  = "eid0ebwtlz36hkbmvv191rxj3ba7c4";
const TWITCH_REDIRECT_URI = "https://mickuu.github.io/twitch-trophies/";
const TWITCH_STORAGE_KEY  = "twitchUser";
const FIREBASE_URL = "https://succes-twitch-default-rtdb.europe-west1.firebasedatabase.app/user_achievements.json";

/* ================================================================
   ÉTAT GLOBAL
================================================================ */
let achievementsData         = [];
let userAchievements         = [];
let originalAchievementsData = [];
let displayedAchievements    = [];
let currentPopupIndex        = 0;
let showLocked               = true;
let isSortedByRarity         = false;
let allUsers                 = [];
let usersPage                = 1;
const USERS_PER_PAGE         = 10;

/* ================================================================
   INITIALISATION
================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    setupTwitchAuthUI();
    restoreTwitchUserFromStorage();
    handleTwitchRedirect();
});

loadUsersList();

/* ================================================================
   DONNÉES — CHARGEMENT
================================================================ */
async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    const rows = text.trim().split("\n").map((row) => row.split(","));
    const headers = rows.shift();
    return rows.map((row) => {
        let obj = {};
        headers.forEach((h, i) => (obj[h.trim()] = row[i] ? row[i].trim() : ""));
        return obj;
    });
}

async function loadUserAchievementsFromFirebase() {
    const response = await fetch(FIREBASE_URL);
    const data = await response.json();
    const result = [];
    for (const pseudo in data) {
        for (const id in data[pseudo]) {
            if (data[pseudo][id] === true) result.push({ pseudo, id });
        }
    }
    return result;
}

async function loadAchievements() {
    const username = document.getElementById("username").value.trim();
    if (!username) { alert("Entrez un pseudo Twitch !"); return; }

    achievementsData = await loadCSV("achievements.csv");
    userAchievements = await loadUserAchievementsFromFirebase();
    originalAchievementsData = [...achievementsData];

    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);

    displayAchievements(obtained);
    document.getElementById("main-progress").style.display = "block";
}

/* ================================================================
   SUCCÈS — AFFICHAGE
================================================================ */
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

        const rarity = achievement.rarity?.toLowerCase() || "";
        if (rarity.includes("commun"))     div.classList.add("rarity-common");
        else if (rarity.includes("rare"))  div.classList.add("rarity-rare");
        else if (rarity.includes("épique")) div.classList.add("rarity-epic");
        else if (rarity.includes("légendaire")) div.classList.add("rarity-legendary");

        const inner = document.createElement("div");
        inner.classList.add("achievement-inner");
        inner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;
        div.appendChild(inner);

        const num = document.createElement("span");
        num.classList.add("achievement-number");
        num.textContent = achievement.id;
        div.appendChild(num);

        const desc = document.createElement("p");
        desc.textContent = achievement.description || "";
        desc.classList.add("achievement-desc");
        if (rarity.includes("commun"))     desc.classList.add("common");
        else if (rarity.includes("rare"))  desc.classList.add("rare");
        else if (rarity.includes("épique")) desc.classList.add("epic");
        else if (rarity.includes("légendaire")) desc.classList.add("legendary");
        div.appendChild(desc);

        if (isUnlocked) {
            displayedAchievements.push(achievement);
            div.addEventListener("click", () => showPopup(achievement));
        }

        container.appendChild(div);
        setTimeout(() => { div.style.opacity = 1; }, index * 50);
    });

    updateProgress(unlockedCount, achievementsData.length);
}

function clearAchievementsDisplay() {
    const container = document.getElementById("achievements");
    if (container) {
        container.innerHTML = "";
        const placeholder = document.createElement("p");
        placeholder.classList.add("achievements-placeholder");
        placeholder.textContent = "Connecte-toi avec Twitch pour voir tes succès débloqués.";
        container.appendChild(placeholder);
    }

    const fill = document.getElementById("progress-bar-fill");
    const text = document.getElementById("progress-counter");
    if (fill && text) {
        fill.style.width = "0%";
        text.textContent = `0 / ${achievementsData?.length || 0}`;
    }

    const mainProgress = document.getElementById("main-progress");
    if (mainProgress) mainProgress.style.display = "none";

    displayedAchievements = [];
}

/* ================================================================
   SUCCÈS — PROGRESSION
================================================================ */
function updateProgress(unlocked, total) {
    const fill = document.getElementById("progress-bar-fill");
    const text = document.getElementById("progress-counter");
    if (!fill || !text) return;
    const pct = total > 0 ? (unlocked / total) * 100 : 0;
    fill.style.width = `${pct}%`;
    text.textContent = `${unlocked} / ${total}`;
}

// Alias conservé pour compatibilité
function updateCircularProgress(unlocked, total) { updateProgress(unlocked, total); }

/* ================================================================
   SUCCÈS — POPUP
================================================================ */
function showPopup(achievement) {
    currentPopupIndex = displayedAchievements.findIndex((a) => a.id === achievement.id);
    updatePopupContent(achievement);
    document.getElementById("popup").classList.add("visible");
}

function hidePopup() {
    document.getElementById("popup").classList.remove("visible");
}

function updatePopupContent(achievement) {
    const popupInner       = document.getElementById("popup-inner");
    const popupDescription = document.getElementById("popup-description");
    const popupAchievement = document.querySelector(".popup-achievement");

    const found = achievementsData.find((a) => a.id === achievement.id);
    const description = achievement.description || found?.description || "Pas de description disponible";
    const rarity = achievement.rarity?.toLowerCase() || "";

    popupInner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;
    popupDescription.className = "";

    if (rarity.includes("commun"))          popupDescription.classList.add("common");
    else if (rarity.includes("rare"))       popupDescription.classList.add("rare");
    else if (rarity.includes("épique"))     popupDescription.classList.add("epic");
    else if (rarity.includes("légendaire")) popupDescription.classList.add("legendary");

    popupDescription.textContent = description;

    popupAchievement.classList.remove("common", "rare", "epic", "legendary");
    if (rarity.includes("commun"))          popupAchievement.classList.add("common");
    else if (rarity.includes("rare"))       popupAchievement.classList.add("rare");
    else if (rarity.includes("épique"))     popupAchievement.classList.add("epic");
    else if (rarity.includes("légendaire")) popupAchievement.classList.add("legendary");
}

function navigatePopup(direction) {
    const popupContent = document.getElementById("popup-content");
    const outClass = direction > 0 ? "slide-out-left" : "slide-out-right";
    const inClass  = direction > 0 ? "slide-in-right" : "slide-in-left";

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
   SUCCÈS — FILTRES ET TRI
================================================================ */
function toggleLocked() {
    showLocked = !showLocked;
    document.getElementById("lockButton").textContent =
        showLocked ? "Masquer les non-obtenus" : "Montrer les non-obtenus";
    refreshAchievementsDisplay();
}

function toggleSortByRarity() {
    const button = document.getElementById("sortButton");
    if (!isSortedByRarity) {
        const rarityOrder = { commun: 1, rare: 2, épique: 3, legendaire: 4, légendaire: 4 };
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
    refreshAchievementsDisplay();
}

function refreshAchievementsDisplay() {
    const username = document.getElementById("username").value.trim();
    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);
    displayAchievements(obtained);
}

/* ================================================================
   TWITCH — AUTHENTIFICATION
================================================================ */
function setupTwitchAuthUI() {
    const loginBtn  = document.getElementById("twitch-login-btn");
    const logoutBtn = document.getElementById("twitch-logout-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const url = new URL("https://id.twitch.tv/oauth2/authorize");
            url.searchParams.set("client_id",    TWITCH_CLIENT_ID);
            url.searchParams.set("redirect_uri",  TWITCH_REDIRECT_URI);
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
    const loginBtn  = document.getElementById("twitch-login-btn");
    const logoutBtn = document.getElementById("twitch-logout-btn");
    if (isLoggedIn) {
        loginBtn?.classList.add("hidden");
        logoutBtn?.classList.remove("hidden");
    } else {
        loginBtn?.classList.remove("hidden");
        logoutBtn?.classList.add("hidden");
    }
}

async function handleTwitchRedirect() {
    if (!window.location.hash?.includes("access_token")) return;
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get("access_token");
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    if (accessToken) {
        const user = await fetchTwitchUser(accessToken);
        if (user) onTwitchUserLoggedIn(user);
    }
}

function restoreTwitchUserFromStorage() {
    const stored = localStorage.getItem(TWITCH_STORAGE_KEY);
    if (!stored) { setAuthButtonsState(false); return; }
    try {
        const data = JSON.parse(stored);
        if (data?.login) {
            onTwitchUserLoggedIn(
                { login: data.login, display_name: data.displayName || data.login },
                { skipSave: true, autoLoad: true }
            );
        } else {
            setAuthButtonsState(false);
        }
    } catch (e) {
        console.error("Erreur restoreTwitchUserFromStorage:", e);
        setAuthButtonsState(false);
    }
}

function onTwitchUserLoggedIn(user, options = {}) {
    const opts = Object.assign({ skipSave: false, autoLoad: true }, options);
    const login       = user.login;
    const displayName = user.display_name || login;

    if (!opts.skipSave) {
        localStorage.setItem(TWITCH_STORAGE_KEY, JSON.stringify({ login, displayName }));
    }

    const label = document.getElementById("current-user-label");
    if (label) label.textContent = `Connecté en tant que ${displayName} (@${login})`;

    const usernameInput = document.getElementById("username");
    if (usernameInput) usernameInput.value = login;

    setAuthButtonsState(true);
    if (opts.autoLoad) loadAchievements();
}

async function fetchTwitchUser(accessToken) {
    try {
        const res = await fetch("https://api.twitch.tv/helix/users", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Client-Id": TWITCH_CLIENT_ID
            }
        });
        if (!res.ok) { console.error("Erreur Twitch API:", res.status); return null; }
        const data = await res.json();
        return data.data?.[0] ?? null;
    } catch (err) {
        console.error("Erreur fetchTwitchUser:", err);
        return null;
    }
}

/* ================================================================
   VIEWERS — DROPDOWN PAGINÉ
================================================================ */
async function loadUsersList() {
    const data = await loadUserAchievementsFromFirebase();

    const userMap = {};
    data.forEach((u) => {
        if (!userMap[u.pseudo]) userMap[u.pseudo] = 0;
        userMap[u.pseudo]++;
    });

    allUsers = Object.entries(userMap)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    const toggle = document.getElementById("users-dropdown-toggle");
    if (toggle) toggle.textContent = `Viewers (${allUsers.length}) ▾`;

    renderUsersPage();
}

function renderUsersPage() {
    const menu = document.getElementById("users-dropdown-menu");
    if (!menu) return;
    menu.innerHTML = "";

    const totalPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
    const start      = (usersPage - 1) * USERS_PER_PAGE;
    const pageUsers  = allUsers.slice(start, start + USERS_PER_PAGE);

    pageUsers.forEach(([pseudo, count]) => {
        const div = document.createElement("div");
        div.classList.add("user-card");
        div.textContent = `${pseudo} (${count})`;
        div.addEventListener("click", () => {
            document.getElementById("username").value = pseudo;
            loadAchievements();
            menu.classList.add("hidden");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        menu.appendChild(div);
    });

    const pager = document.createElement("div");
    pager.classList.add("users-pager");

    const prev = document.createElement("button");
    prev.textContent = "←";
    prev.classList.add("users-pager-btn");
    prev.disabled = usersPage === 1;
    prev.addEventListener("click", (e) => { e.stopPropagation(); usersPage--; renderUsersPage(); });

    const info = document.createElement("span");
    info.classList.add("users-pager-info");
    info.textContent = `${usersPage} / ${totalPages}`;

    const next = document.createElement("button");
    next.textContent = "→";
    next.classList.add("users-pager-btn");
    next.disabled = usersPage === totalPages;
    next.addEventListener("click", (e) => { e.stopPropagation(); usersPage++; renderUsersPage(); });

    pager.append(prev, info, next);
    menu.appendChild(pager);
}

function toggleUsersDropdown() {
    document.getElementById("users-dropdown-menu")?.classList.toggle("hidden");
}

document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".users-dropdown-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById("users-dropdown-menu")?.classList.add("hidden");
    }
});