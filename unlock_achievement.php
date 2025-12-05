<?php

$SECRET_TOKEN = "QvHnTJ@y#4HD8&jY%Vn";

// Chemin vers le CSV des succès utilisateurs
$csvFile = __DIR__ . '/user_achievements.csv';

// --- 1. Vérif méthode HTTP ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Méthode non autorisée";
    exit;
}

// --- 2. Récup paramètres ---
$pseudo         = isset($_POST['pseudo']) ? trim($_POST['pseudo']) : '';
$achievement_id = isset($_POST['achievement_id']) ? trim($_POST['achievement_id']) : '';
$token          = isset($_POST['token']) ? trim($_POST['token']) : '';

// --- 3. Vérifs basiques ---
if ($token !== $SECRET_TOKEN) {
    http_response_code(403);
    echo "Token invalide";
    exit;
}

if ($pseudo === '' || $achievement_id === '' || !ctype_digit($achievement_id)) {
    http_response_code(400);
    echo "Paramètres invalides";
    exit;
}

// --- 4. Charger CSV actuel pour éviter les doublons ---
$alreadyUnlocked = false;

if (file_exists($csvFile)) {
    if (($handle = fopen($csvFile, 'r')) !== false) {
        // sauter l'en-tête "pseudo,id"
        $header = fgetcsv($handle, 1000, ",");
        while (($data = fgetcsv($handle, 1000, ",")) !== false) {
            if (count($data) >= 2) {
                $p  = trim($data[0]);
                $id = trim($data[1]);
                if (strcasecmp($p, $pseudo) === 0 && $id === $achievement_id) {
                    $alreadyUnlocked = true;
                    break;
                }
            }
        }
        fclose($handle);
    }
}

// --- 5. Si déjà débloqué : on répond OK mais on n’ajoute rien ---
if ($alreadyUnlocked) {
    echo "Déjà débloqué";
    exit;
}

// --- 6. Ajouter la nouvelle ligne ---
$needHeader = !file_exists($csvFile) || filesize($csvFile) === 0;

if (($handle = fopen($csvFile, 'a')) === false) {
    http_response_code(500);
    echo "Impossible d'ouvrir le fichier CSV";
    exit;
}

// Si fichier vide, on ajoute l'en-tête
if ($needHeader) {
    fputcsv($handle, ['pseudo', 'id']);
}

// Ajouter la nouvelle entrée
fputcsv($handle, [$pseudo, $achievement_id]);

fclose($handle);

echo "Succès débloqué pour $pseudo (ID $achievement_id)";
