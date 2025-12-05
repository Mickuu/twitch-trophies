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
const TWITCH_CLIENT_ID = "eid0ebwtlz36hkbmvv191rxj3ba7c4"; // ⚠ ID Twitch
const TWITCH_REDIRECT_URI = "https://mickuu.github.io/twitch-trophies/";
const TWITCH_STORAGE_KEY = "twitchUser"; // pour mémoriser l'utilisateur côté navigateur

document.addEventListener("DOMContentLoaded", () => {
    setupTwitchAuthUI();
    restoreTwitchUserFromStorage();
    handleTwitchRedirect();
});


/* ================================================================
   CHARGEMENT DES DONNÉES CSV
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

// Charger les succès et lier à l'utilisateur
async function loadAchievements() {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Entrez un pseudo Twitch !");
        return;
    }

    achievementsData = await loadCSV("achievements.csv");
    userAchievements = await loadCSV("user_achievements.csv");

    // Sauvegarde de l'ordre initial
    originalAchievementsData = [...achievementsData];

    const obtained = userAchievements
        .filter((a) => a.pseudo.toLowerCase() === username.toLowerCase())
        .map((a) => a.id);

    displayAchievements(obtained);
}

/* ================================================================
   AFFICHAGE DES SUCCÈS
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

        // Conteneur succès
        const div = document.createElement("div");
        div.classList.add("achievement");
        if (!isUnlocked) div.classList.add("locked");

        // Image succès
        const inner = document.createElement("div");
        inner.classList.add("achievement-inner");
        inner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;
        div.appendChild(inner);

        // Description + rareté
        const desc = document.createElement("p");
        desc.textContent = achievement.description || "";
        desc.classList.add("achievement-desc");

        const rarity = achievement.rarity?.toLowerCase() || "";
        if (rarity.includes("commun")) desc.classList.add("common");
        else if (rarity.includes("rare")) desc.classList.add("rare");
        else if (rarity.includes("épique")) desc.classList.add("epic");
        else if (rarity.includes("légendaire")) desc.classList.add("legendary");

        div.appendChild(desc);

        // Interaction si débloqué
        if (isUnlocked) {
            displayedAchievements.push(achievement);
            div.addEventListener("click", () => showPopup(achievement));
        }

        container.appendChild(div);

        // Animation d’apparition
        setTimeout(() => {
            div.style.opacity = 1;
        }, index * 50);
    });

    updateProgress(unlockedCount, achievementsData.length);
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

    // Calcul cercle
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
    const description =
        achievement.description ||
        found?.description ||
        "Pas de description disponible";
    const rarity = achievement.rarity?.toLowerCase() || "";

    // Image du popup
    popupInner.style.backgroundImage = `url(img/achievements/${achievement.id}.png)`;

    // Reset classes description
    popupDescription.className = "";

    // Appliquer couleur description
    if (rarity.includes("commun")) popupDescription.classList.add("common");
    else if (rarity.includes("rare")) popupDescription.classList.add("rare");
    else if (rarity.includes("épique")) popupDescription.classList.add("epic");
    else if (rarity.includes("légendaire"))
        popupDescription.classList.add("legendary");

    popupDescription.textContent = description;

    // Reset classes popup-achievement
    popupAchievement.classList.remove("common", "rare", "epic", "legendary");

    // Appliquer couleur fond popup
    if (rarity.includes("commun")) popupAchievement.classList.add("common");
    else if (rarity.includes("rare")) popupAchievement.classList.add("rare");
    else if (rarity.includes("épique")) popupAchievement.classList.add("epic");
    else if (rarity.includes("légendaire"))
        popupAchievement.classList.add("legendary");
}

// Navigation avec animation
function navigatePopup(direction) {
    const popupContent = document.getElementById("popup-content");

    const outClass = direction > 0 ? "slide-out-left" : "slide-out-right";
    const inClass = direction > 0 ? "slide-in-right" : "slide-in-left";

    // Animation sortie
    popupContent.classList.add(outClass);

    popupContent.addEventListener("animationend", function handler() {
        popupContent.classList.remove(outClass);
        popupContent.removeEventListener("animationend", handler);

        // Mise à jour de l’index
        currentPopupIndex += direction;
        if (currentPopupIndex < 0)
            currentPopupIndex = displayedAchievements.length - 1;
        if (currentPopupIndex >= displayedAchievements.length)
            currentPopupIndex = 0;

        // Mise à jour contenu
        updatePopupContent(displayedAchievements[currentPopupIndex]);

        // Animation entrée
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
            const scopes = []; // pas besoin de scopes particuliers ici

            const url = new URL("https://id.twitch.tv/oauth2/authorize");
            url.searchParams.set("client_id", TWITCH_CLIENT_ID);
            url.searchParams.set("redirect_uri", TWITCH_REDIRECT_URI);
            url.searchParams.set("response_type", "token");
            url.searchParams.set("scope", scopes.join(" "));

            window.location.href = url.toString();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // On "déconnecte" localement : on oublie l'utilisateur
            localStorage.removeItem(TWITCH_STORAGE_KEY);

            const label = document.getElementById("current-user-label");
            if (label) label.textContent = "";

            const usernameInput = document.getElementById("username");
            if (usernameInput) usernameInput.value = "";

            setAuthButtonsState(false);

            // Si tu veux, tu peux aussi vider l'affichage des succès ici
            // clearAchievementsDisplay();
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

// Quand Twitch nous renvoie sur la page avec #access_token=...
async function handleTwitchRedirect() {
    if (window.location.hash && window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");

        // Nettoyage de l'URL (enlève le #access_token=...)
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        if (accessToken) {
            const user = await fetchTwitchUser(accessToken);
            if (user) {
                onTwitchUserLoggedIn(user);
            }
        }
    }
}

// Quand on actualise la page, on restaure l'utilisateur si on l'avait déjà
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

// Gère tout ce qu'il faut faire quand on a les infos Twitch
function onTwitchUserLoggedIn(user, options) {
    const opts = Object.assign({ skipSave: false, autoLoad: true }, options || {});
    const login = user.login;
    const displayName = user.display_name || login;

    // Sauvegarde dans le localStorage (sauf si on vient déjà de restore)
    if (!opts.skipSave) {
        localStorage.setItem(
            TWITCH_STORAGE_KEY,
            JSON.stringify({ login, displayName })
        );
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

    // Charge automatiquement les succès pour ce compte
    if (opts.autoLoad && typeof loadAchievements === "function") {
        loadAchievements();
    }
}

async function fetchTwitchUser(accessToken) {
    try {
        const res = await fetch("https://api.twitch.tv/helix/users", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Client-Id": TWITCH_CLIENT_ID,
            },
        });

        if (!res.ok) {
            console.error("Erreur Twitch API:", res.status, await res.text());
            return null;
        }

        const data = await res.json();
        if (data.data && data.data.length > 0) {
            return data.data[0]; // { id, login, display_name, ... }
        }
    } catch (err) {
        console.error("Erreur fetchTwitchUser:", err);
    }
    return null;
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
            return data.data[0]; // { id, login, display_name, ... }
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
    const users = await loadCSV("user_achievements.csv");

    // Grouper par pseudo et compter les succès
    const userMap = {};
    users.forEach((u) => {
        if (!userMap[u.pseudo]) userMap[u.pseudo] = 0;
        userMap[u.pseudo]++;
    });

    // Filtrer uniquement ceux qui ont au moins 1 succès
    const userEntries = Object.entries(userMap)
        .filter(([pseudo, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]); // tri décroissant

    const usersListDiv = document.getElementById("users-list");
    usersListDiv.innerHTML = "";

    userEntries.forEach(([pseudo, count]) => {
        const div = document.createElement("div");
        div.classList.add("user-card");
        div.textContent = `${pseudo} (${count})`;

        // Clic pseudo → charger ses succès
        div.addEventListener("click", () => {
            document.getElementById("username").value = pseudo;
            loadAchievements();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        usersListDiv.appendChild(div);
    });
}

/* ================================================================
   AFFICHAGE GLOBAL PAR UTILISATEUR
================================================================ */
async function loadAllUsersAchievements() {
    const achievements = await loadCSV("achievements.csv");
    const userAchievementsData = await loadCSV("user_achievements.csv");

    // Regrouper par pseudo
    const grouped = {};
    userAchievementsData.forEach((entry) => {
        if (!grouped[entry.pseudo]) grouped[entry.pseudo] = [];
        grouped[entry.pseudo].push(entry.id);
    });

    const container = document.getElementById("users-achievements");
    if (!container) return;
    container.innerHTML = "";

    for (const pseudo in grouped) {
        const unlockedIds = grouped[pseudo];
        const total = achievements.length;
        const unlocked = unlockedIds.length;

        // ---- Compter les succès par rareté ----
        const rarityCounts = {};
        achievements.forEach((ach) => {
            if (unlockedIds.includes(ach.id)) {
                const rarity = ach.rarity?.toLowerCase() || "inconnue";
                if (!rarityCounts[rarity]) rarityCounts[rarity] = 0;
                rarityCounts[rarity]++;
            }
        });

        // Créer section utilisateur
        const section = document.createElement("div");
        section.classList.add("user-section");

        // Header accordéon
        const header = document.createElement("div");
        header.classList.add("user-header");
        header.textContent = pseudo;

        // Conteneur trophées (utilise SVG)
        const trophyContainer = document.createElement("div");
        trophyContainer.classList.add("trophy-counts");

        // Ajout des icônes selon rareté (basé sur noms CSV)
        if (rarityCounts["commun"])
            trophyContainer.innerHTML += `<span class="trophy"><img src="img/trophies/bronze.svg" /> ${rarityCounts["commun"]}</span>`;
        if (rarityCounts["rare"])
            trophyContainer.innerHTML += `<span class="trophy"><img src="img/trophies/argent.svg" /> ${rarityCounts["rare"]}</span>`;
        if (rarityCounts["épique"])
            trophyContainer.innerHTML += `<span class="trophy"><img src="img/trophies/or.svg" /> ${rarityCounts["épique"]}</span>`;
        if (rarityCounts["légendaire"])
            trophyContainer.innerHTML += `<span class="trophy"><img src="img/trophies/platine.svg" /> ${rarityCounts["légendaire"]}</span>`;

        header.appendChild(trophyContainer);

        // Toggle accordéon
        header.addEventListener("click", () => {
            section.classList.toggle("open");
        });
        section.appendChild(header);

        // Progression circulaire
        const progressWrapper = document.createElement("div");
        progressWrapper.classList.add("circular-progress");
        progressWrapper.innerHTML = `
            <svg class="progress-ring" width="150" height="150">
                <circle class="progress-ring-bg" cx="75" cy="75" r="65" />
                <circle class="progress-ring-bar" cx="75" cy="75" r="65" />
            </svg>
            <div class="progress-text">${unlocked} / ${total}</div>
        `;
        section.appendChild(progressWrapper);

        // Mise à jour barre circulaire
        const circle = progressWrapper.querySelector(".progress-ring-bar");
        const radius = 65;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (unlocked / total) * circumference;
        circle.style.strokeDashoffset = offset;

        // Grille des succès
        const grid = document.createElement("div");
        grid.classList.add("user-achievements");

        achievements.forEach((ach) => {
            const isUnlocked = unlockedIds.includes(ach.id);

            const div = document.createElement("div");
            div.classList.add("achievement");
            if (!isUnlocked) div.classList.add("locked");

            const inner = document.createElement("div");
            inner.classList.add("achievement-inner");
            inner.style.backgroundImage = `url(img/achievements/${ach.id}.png)`;
            div.appendChild(inner);

            const desc = document.createElement("p");
            desc.textContent = ach.description || "";
            desc.classList.add("achievement-desc");

            const rarity = ach.rarity?.toLowerCase() || "";
            if (rarity.includes("commun")) desc.classList.add("common");
            else if (rarity.includes("rare")) desc.classList.add("rare");
            else if (rarity.includes("épique")) desc.classList.add("epic");
            else if (rarity.includes("légendaire")) desc.classList.add("legendary");

            div.appendChild(desc);

            // Popup pour succès débloqués
            if (isUnlocked) {
                div.addEventListener("click", () => {
                    displayedAchievements = achievements.filter((a) =>
                        unlockedIds.includes(a.id)
                    );
                    currentPopupIndex = displayedAchievements.findIndex(
                        (a) => a.id === ach.id
                    );
                    showPopup(ach);
                });
            }

            grid.appendChild(div);
        });

        section.appendChild(grid);
        container.appendChild(section);
    }
}


/* ================================================================
   INIT : Charger la liste au démarrage
================================================================ */
loadUsersList();

// Afficher toutes les sections utilisateurs
loadAllUsersAchievements();
