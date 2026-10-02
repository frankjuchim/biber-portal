# Biber-Portal · Max-Planck-Gymnasium Delmenhorst

Schülerinnen und Schüler melden sich mit ihrem **IServ-Konto (Single-Sign-On, OpenID Connect)** an, sehen ihre **Zugangsdaten für den Informatik-Biber** (Benutzername und Passwort, einzeln kopierbar) und kommen mit einem Klick zur **Anmeldung** bzw. zum **Schnupper-Biber**. Welche Weiterleitung im Vordergrund steht, ergibt sich automatisch aus den Wettbewerbsdaten oder wird manuell gesetzt.

## Funktionen

**Schüleransicht**
- Anmeldung nur über IServ; das IServ-Passwort sieht das Portal nie.
- Drei Schritte: Benutzername kopieren → Passwort kopieren (verdeckt, per Auge sichtbar) → **„Direkt einloggen“**: Das Portal schickt Benutzername und Passwort per Formular an die Biber-Anmeldeseite, im neuen Tab ist man sofort angemeldet. Daneben gibt es „Login-Seite öffnen“ zum manuellen Einfügen. Ist der Direkt-Login ausgeschaltet, gibt es wie bisher „Zum Schnupper-Biber“ bzw. „Zum Wettbewerb“.
- Phasenkarte mit Countdown bis zu den Biberwochen und Zeitleiste; Zugangskarte druckbar.
- Ohne hinterlegte Daten erscheint ein freundlicher Hinweis an die Lehrkraft.

**Zugangskarten für Lehrkräfte** (Menüpunkt „Karten“)
- Lehrkräfte werden über IServ erkannt: Rolle bzw. Gruppe „Lehrer“ (Scope `iserv:roles`, siehe `TEACHER_ROLES`). Zusätzlich gelten alle `ADMIN_ACCOUNTS` und `TEACHER_ACCOUNTS`.
- Eine oder mehrere Gruppen wählen → druckfertiger DIN-A4-Bogen mit 8, 10 oder 12 Karten pro Blatt, Schnittlinien, Schullogo, Name, Gruppe, Benutzername, Passwort und Anmeldeadresse; auf Wunsch beginnt jede Gruppe auf einem neuen Blatt.
- **Mehrere Gruppen je Schüler:in:** Neben der Klasse/dem Kurs aus dem Biber-Export kann jeder Zugang beliebig viele weitere Gruppen haben (z. B. „Informatik 10“, „AG Robotik“). Er erscheint in jeder dieser Gruppen. Werden mehrere Gruppen zusammen gedruckt, gibt es pro Person trotzdem nur eine Karte (in der ersten gewählten Gruppe).
- Weitere Gruppen kommen aus: Verwaltung → Import → **„IServ-Gruppenliste“**, einer Spalte `Gruppen` direkt im Biber-Import, oder einzeln über das Stift-Symbol.

**IServ-Gruppenliste: Zuordnung über Klasse + Name**
- Im Biber lassen sich keine IServ-Accountnamen festlegen. Deshalb kann der Biber-Export **ohne** Spalte `IServ` importiert werden; die Zuordnung erledigt danach die IServ-Gruppenliste (Export mit `Gruppe; Nachname; Vorname; Account; Klasse/Information`, eine Zeile pro Gruppenmitgliedschaft, beliebig viele Gruppen/Kurse).
- Abgleich in drei Stufen, jeweils **nur bei eindeutigen Treffern** (genau eine IServ-Person und genau ein Biber-Zugang mit diesem Schlüssel): 1. Klasse + Vor- + Nachname, 2. Vor- + Nachname (falls die Klasse im Biber anders heißt), 3. Klasse + Nachname + erster Vorname (Doppelvornamen). Groß-/Kleinschreibung, Umlaute (ä/ae), Akzente und „Klasse 10C“/„10c“ werden angeglichen.
- Gleichnamige Schüler:innen werden nie geraten: Sie erscheinen in der Vorschau als „mehrdeutig“ mit den möglichen Accounts und werden in der Tabelle „Zuordnung“ von Hand eingetragen. Ebenso „nicht gefunden“ (z. B. abweichende Schreibweise).
- Vorschau vor dem Übernehmen; bestehende Zuordnungen werden nie überschrieben. Personen aus der Liste ohne Biber-Zugang werden nicht gespeichert.
- Drucken mit Skalierung 100 % und ohne Kopf-/Fußzeilen. Jeder Druck wird im Protokoll der Verwaltung vermerkt. Lehrkräfte sehen die Verwaltung nicht.

**Verwaltung** (nur Accounts aus `ADMIN_ACCOUNTS`)
- Import des Biber-Exports als **CSV oder Excel (.xlsx)** mit zusätzlicher Spalte **`IServ`** (Accountname). Vorschau mit Prüfhinweisen, dann „Ergänzen“ oder „Ersetzen“.
- Tabelle mit Suche/Filter, Zuordnung per Accountname direkt nachtragen, Vorschau „als Schüler:in“, Abrufstatus.
- **Einzelne Zugänge per Formular** anlegen (Bereich „Einzeln.“, mit „Anlegen & nächster“ für mehrere hintereinander) und jeden Eintrag über das Stift-Symbol bearbeiten (Name, Klasse, Benutzername, Passwort, IServ-Account). Doppelte Benutzernamen oder IServ-Accounts werden abgewiesen; Abrufzähler bleiben beim Bearbeiten erhalten.
- Phase (automatisch/manuell), Termine, Ziel-Adressen, Hinweistext, Schalter „Zugangsdaten sichtbar“ und „Direkt-Login“ (Standard: an; ausschalten, falls der Biber seine Anmeldeseite ändert und der Direkt-Login nicht mehr klappt).
- Nach dem Wettbewerb: alle Zugangsdaten endgültig löschen.

## Ablauf für die Lehrkraft

1. In der Biber-Verwaltung (admin.informatik-biber.de) die Zugangsdaten als Excel oder CSV herunterladen.
2. Im Portal unter **Verwaltung → Import** hochladen, Vorschau prüfen, übernehmen. (Eine Spalte **`IServ`** mit Accountnamen ist optional.)
3. In IServ die Gruppenliste exportieren (Jahrgang bzw. Klassen und Kurse) und unter **Verwaltung → Import → IServ-Gruppenliste** hochladen. Die Vorschau zeigt, wer über Klasse + Name zugeordnet wird und wer nicht; übernehmen.
4. Offene/mehrdeutige Zuordnungen in der Tabelle nachtragen. Über das Auge-Symbol die Ansicht einer Schülerin/eines Schülers prüfen.

Erkannte Spaltenköpfe (tolerant): `Benutzername`, `Passwort`, `IServ` / `IServ-Account` / `Account`, `Vorname`, `Nachname`, `Klassen-/Kursname` / `Klasse`, `Stufe`. Titelzeilen oberhalb der Kopfzeile, Semikolon/Komma/Tab sowie UTF-8 und Windows-1252 (Excel-CSV) werden erkannt. Eine Vorlage gibt es in der Verwaltung.

## Mehrere Jahre nutzen

Die Biber-Konten der Schüler:innen bleiben von Jahr zu Jahr gleich (der Biber-Export führt die Teilnahmen als Spalten wie „Informatik-Biber 2025“, „Schnupper-Biber 2026“). Ablauf zu Beginn eines neuen Wettbewerbsjahres:

1. **Einstellungen:** Termine (Schnupper-Biber, Biberwochen) auf das neue Jahr setzen. Die Jahreszahl im Portal und auf den Karten ergibt sich aus „Biberwochen ab“.
2. **Biber-Export neu hochladen** (direkt die Excel-Datei aus der Biber-Verwaltung, keine Bearbeitung nötig) und **„Abgleichen (neues Schuljahr)“** wählen: Klassen, Namen und Passwörter werden aktualisiert, Abgänger entfernt, neue Fünftklässler hinzugefügt. **IServ-Zuordnungen und Gruppen bleiben** für alle, die schon da waren (Abgleich über den Biber-Benutzernamen).
3. **Aktuelle IServ-Gruppenliste** hochladen: ordnet die Neuen über Klasse + Name zu und aktualisiert die Kurse (für veraltete Kurse „Ersetzen“ wählen).
4. Optional: unter „Protokoll“ die Abrufstatistik zurücksetzen.

**Abrufstatistik:** Abrufe werden getrennt gezählt – **Schnupper** (vor den Biberwochen) und **Wettbewerb** (ab Start der Biberwochen, laut Einstellungen bzw. Phase). Die Kachel in der Verwaltung zeigt groß den aktuellen Zeitraum und darunter den anderen; in der Tabelle steht beides je Zugang. Ein Zurücksetzen zum Start der Biberwochen ist dadurch nicht nötig.

„Alles löschen“ ist nur nötig, wenn das Portal nicht weiter genutzt wird.

## IServ einrichten (Single-Sign-On)

In IServ als Administrator: **Verwaltung → System → Single-Sign-On → Hinzufügen** (OAuth/OpenID Connect):

| Feld | Wert |
|---|---|
| Name | Biber-Portal |
| Client-ID / Client-Geheimnis | frei wählen bzw. übernehmen → in `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` |
| Weiterleitungs-URI | `https://<Ihre-Portal-Adresse>/auth/callback` |
| Grant-Typ | Authorization Code |
| Scopes | `openid`, `profile`, `email`, **`iserv:roles`** (für die Erkennung von Lehrkräften; optional zusätzlich `iserv:groups`) |
| Vertrauenswürdig | ja (dann entfällt die Zustimmungsabfrage) |
| Beschränkung auf Gruppen/Rollen | optional, z. B. nur Schüler:innen + Informatik-Lehrkräfte |

Die Nutzer:innen brauchen in IServ das Recht **„OAuth verwenden“**. Das Portal liest die Endpunkte automatisch aus `https://<iserv>/.well-known/openid-configuration`, prüft das ID-Token (Signatur, Aussteller, Zielgruppe, Nonce), nutzt PKCE und ordnet über den Claim `preferred_username` (= IServ-Accountname) zu.

## Deployment mit CapRover

### 1. App einrichten

1. In CapRover eine neue App anlegen (z. B. `biber`).
2. **HTTP Settings:** Domain verbinden (z. B. `biber.ihre-domain.de`), **HTTPS aktivieren** und **„Force HTTPS“** einschalten.
3. **App Configs → Container HTTP Port:** `80`.
4. **App Configs → Persistent Directories:** Path in App `/app/data` (Label z. B. `biber-data`). Ohne dieses Verzeichnis sind importierte Zugangsdaten nach jedem Deploy weg.

### 2. Umgebungsvariablen anlegen

Unter **App Configs → Environmental Variables** (am schnellsten über **„Bulk Edit“**) eintragen und mit **„Save & Update“** speichern:

```dotenv
NODE_ENV=production
BASE_URL=https://biber.ihre-domain.de
ISERV_URL=https://ihre-iserv-domain.de
OIDC_CLIENT_ID=<aus IServ>
OIDC_CLIENT_SECRET=<aus IServ>
ADMIN_ACCOUNTS=vorname.nachname
SESSION_SECRET=<zufällig, mind. 32 Zeichen>
DATA_KEY=<zufällig, mind. 32 Zeichen – nie wieder ändern>
```

**Pflicht**

| Variable | Wert / Bedeutung |
|---|---|
| `NODE_ENV` | `production` – aktiviert sichere Cookies und strenge Prüfungen. Ohne diesen Wert startet das Portal im Entwicklungsmodus (u. a. `localhost` als Rücksprung-Adresse). |
| `BASE_URL` | Öffentliche Adresse des Portals mit `https://`, **ohne** Schrägstrich am Ende. Daraus entsteht die Weiterleitungs-URI für IServ: `BASE_URL/auth/callback`. |
| `ISERV_URL` | Adresse des Schul-IServ (nur Domain, ohne `/iserv`). Muss dem `issuer` unter `https://<iserv>/.well-known/openid-configuration` entsprechen. |
| `OIDC_CLIENT_ID` | Client-ID des Single-Sign-On-Clients in IServ. |
| `OIDC_CLIENT_SECRET` | Client-Geheimnis des Single-Sign-On-Clients in IServ. |
| `ADMIN_ACCOUNTS` | IServ-Accountnamen mit Zugriff auf die Verwaltung, kommagetrennt (z. B. `vorname.nachname,kollegin.name`). |
| `SESSION_SECRET` | Zufallswert (≥ 32 Zeichen) zum Signieren der Sitzungen. Ändern meldet alle ab. |
| `DATA_KEY` | Zufallswert (≥ 32 Zeichen), mit dem die Zugangsdaten verschlüsselt gespeichert werden (AES-256-GCM). **Nach dem ersten Start nie ändern** – sonst sind die gespeicherten Daten nicht mehr lesbar. Zusätzlich sicher aufbewahren (z. B. Passwortmanager). |

Geheimnisse erzeugen: `./build.sh secrets` (oder `openssl rand -base64 48`).

**Optional**

| Variable | Standard | Wofür |
|---|---|---|
| `SCHOOL_NAME` | `Max-Planck-Gymnasium Delmenhorst` | Schulname in Navigation, Startseite, Fußzeile und Zugangskarte |
| `SCHOOL_URL` | `https://www.maxe-online.de` | Link zur Schulwebseite (Logo, Fußzeile); leer = ausblenden |
| `SCHOOL_ADDRESS` | `Max-Planck-Str. 4, 27749 Delmenhorst` | Adresse auf Startseite und in der Fußzeile; leer = ausblenden |
| `IMPRESSUM_URL` | Impressum auf maxe-online.de | Link „Impressum“ in der Fußzeile; leer = ausblenden |
| `DATENSCHUTZ_URL` | Datenschutz auf maxe-online.de | Link „Datenschutz“ in der Fußzeile; leer = ausblenden |
| `TRUST_PROXY` | `1` (in Produktion) | Anzahl vertrauenswürdiger Proxys; hinter CapRover/nginx passt `1` |
| `OIDC_SCOPE` | `openid profile email iserv:roles` | Angefragte Scopes. Ist `iserv:roles` im IServ-Client nicht freigegeben, schlägt die Anmeldung fehl – dann freigeben oder hier entfernen (Lehrkräfte dann nur über `TEACHER_ACCOUNTS`). Für Erkennung über Gruppen `iserv:groups` ergänzen. |
| `TEACHER_ROLES` | `Lehrer,Lehrerin,Lehrkraft,Lehrkräfte,…,Teacher` | Namen von IServ-Rollen oder -Gruppen (Anzeigename oder Accountname, Groß-/Kleinschreibung egal), deren Mitglieder als Lehrkraft gelten und Zugangskarten drucken dürfen |
| `TEACHER_ACCOUNTS` | leer | Zusätzliche IServ-Accounts mit Kartendruck, kommagetrennt |
| `OIDC_ACCOUNT_CLAIM` | `preferred_username` | Claim, der den IServ-Accountnamen enthält |
| `OIDC_TOKEN_AUTH_METHOD` | automatisch | `client_secret_basic` oder `client_secret_post` – nur setzen, wenn der Token-Abruf scheitert |
| `OIDC_PKCE` | `true` | Auf `false`, falls IServ PKCE ablehnt |

`PORT` (80) und `DATA_DIR` (`/app/data`) setzt bereits das Dockerfile – nicht anlegen.

### 3. Automatisch deployen per GitHub-Webhook (empfohlen)

Bei jedem Push auf den gewählten Branch holt CapRover den Code von GitHub, baut das Image (`captain-definition` → `Dockerfile`) und startet es neu. **Die Tests laufen beim Bauen mit** (erste Stufe im Dockerfile): Schlägt ein Test fehl, bricht der Build ab und die bisherige Version bleibt online.

**a) Deploy-Key anlegen** (nur Lesezugriff, nur auf dieses Repository – besser als ein persönliches Token):

```bash
ssh-keygen -t ed25519 -C "caprover-biber" -N "" -f caprover-biber
```

- GitHub → Repository → **Settings → Deploy keys → Add deploy key**: Titel `CapRover`, Inhalt von `caprover-biber.pub` einfügen, **„Allow write access“ aus lassen**.
- Den privaten Schlüssel (`caprover-biber`, ohne `.pub`) braucht gleich CapRover. Danach beide Dateien löschen bzw. sicher ablegen.

**b) CapRover verbinden:** App → **Deployment → „Method 3: Deploy from Github/Bitbucket/Gitlab“**

| Feld | Wert |
|---|---|
| Repository | `git@github.com:frankjuchim/biber-portal.git` |
| Branch | `main` |
| Username / Password | leer lassen |
| SSH Key | Inhalt der Datei `caprover-biber` (privater Schlüssel, inkl. `-----BEGIN …` / `-----END …`) |

**„Save & Update“** – CapRover zeigt danach oberhalb der Felder eine **Webhook-URL** (`https://captain.…/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token=…`). Einmal **„Force Build“** klicken, um den ersten Build zu starten und im Build-Log zu prüfen, dass alles durchläuft (`# pass … # fail 0`).

**c) Webhook in GitHub:** Repository → **Settings → Webhooks → Add webhook**

| Feld | Wert |
|---|---|
| Payload URL | die Webhook-URL aus CapRover (enthält ein Token – geheim halten) |
| Content type | `application/json` |
| Secret | leer |
| Events | **Just the push event** |

Fertig: Jeder Push bzw. jeder gemergte Pull Request auf `main` wird automatisch ausgeliefert. Zugangsdaten bleiben dabei erhalten, solange das Persistent Directory `/app/data` eingerichtet ist (Schritt 1) und `DATA_KEY` gleich bleibt.

> Alternative ohne SSH-Key: In CapRover Username = GitHub-Benutzername und Password = *Fine-grained Personal Access Token* (nur dieses Repository, Berechtigung „Contents: Read-only“), Repository dann als `github.com/frankjuchim/biber-portal`.

### 4. Manuell deployen (ohne GitHub)

```bash
./build.sh deploy            # App interaktiv auswählen
./build.sh deploy biber      # direkt in die App „biber“
```

Alternativ `./build.sh` ausführen und `dist/biber-portal.tar` in CapRover unter **Deployment → „Upload tar file“** hochladen.

### Häufige Fehler

| Meldung | Ursache |
|---|---|
| Build-Log: `not ok … # fail 1` | Ein Test schlägt fehl – der Build bricht absichtlich ab, die alte Version läuft weiter. Fehler beheben und erneut pushen. |
| Build-Log: `Permission denied (publickey)` / `Repository not found` | Deploy-Key fehlt in GitHub, falscher (öffentlicher statt privater) Schlüssel in CapRover, oder Repository nicht im SSH-Format eingetragen. |
| Push löst keinen Build aus | GitHub → Settings → Webhooks → „Recent Deliveries“ prüfen; Branch in CapRover muss zum gepushten Branch passen. |
| IServ: „Redirect-URI ist ungültig“ | Weiterleitungs-URI in IServ ≠ `BASE_URL/auth/callback`, oder `BASE_URL`/`NODE_ENV` fehlen (dann wird `localhost` gesendet). |
| Log: `Login-Start fehlgeschlagen … ConnectTimeoutError` | Der Server erreicht IServ nicht (Firewall/Länder- oder IP-Sperre in IServ, falsche `ISERV_URL`). Test auf dem Server: `curl https://<iserv>/.well-known/openid-configuration`. |
| Start bricht ab: „Datenspeicher konnte nicht entschlüsselt werden“ | `DATA_KEY` wurde geändert. Alten Schlüssel wieder eintragen. |
| Anmeldung schlägt fehl, Log: `invalid_scope` | Scope `iserv:roles` ist im IServ-Client nicht freigegeben. In IServ freigeben oder `OIDC_SCOPE=openid profile email` setzen. |
| Lehrkraft sieht keinen Menüpunkt „Karten“ | Rolle heißt in IServ anders: Namen unter `TEACHER_ROLES` ergänzen (die erkannte Rolle steht bei Admins auf der Seite „Karten“), oder Account in `TEACHER_ACCOUNTS` eintragen. Danach neu anmelden. |
| Log: `Token-Abruf fehlgeschlagen (400): Grant type is unauthorized for this client` | Im IServ-Client ist der Grant-Typ **„Authorization Code“** nicht angehakt. In IServ → Single-Sign-On → Client bearbeiten freigeben. |
| Start bricht ab: „Umgebungsvariable … fehlt“ | Pflichtvariable nicht gesetzt (siehe Tabelle oben). |

## build.sh

```bash
./build.sh            # prüfen (Syntax, Tests) und dist/biber-portal.tar bauen
./build.sh dev        # lokal: Portal :3000 + Test-IServ :4000
./build.sh deploy     # bauen und per CapRover-CLI deployen (App interaktiv wählen)
./build.sh deploy biber   # direkt in die CapRover-App „biber“
./build.sh secrets    # SESSION_SECRET und DATA_KEY erzeugen
./build.sh docker     # Docker-Image lokal bauen und starten
./build.sh help       # alle Befehle
```

## Lokal testen (ohne echtes IServ)

```bash
npm install
npm run mock-iserv            # Test-IServ auf Port 4000 mit Beispielkonten
NODE_ENV=development npm start  # Portal auf http://localhost:3000
npm test                      # Unit- und Ende-zu-Ende-Tests
```

Im Mock-IServ gibt es u. a. `max.mustermann`, `erika.musterfrau`, `lena.ohnedaten`, die Lehrkraft `petra.pauker` (Rolle „Lehrer“) und den Admin `andre.bodendiek`.

## Datenschutz und Sicherheit

- Gespeichert werden nur: Biber-Benutzername, Biber-Passwort, IServ-Accountname, Name/Klasse aus dem Export sowie Abrufzeitpunkte. IServ-Tokens werden nicht gespeichert.
- Datenspeicher vollständig verschlüsselt; Sitzungscookie signiert, `HttpOnly`, `SameSite=Lax`, `Secure` unter HTTPS; CSRF-Schutz für alle Formulare; strikte Content-Security-Policy; Seiten mit Zugangsdaten werden nicht zwischengespeichert (`no-store`).
- Nach dem Wettbewerb lassen sich alle Zugangsdaten in der Verwaltung mit einem Schritt löschen.
- Direkt-Login: Der Button sendet Benutzername und Passwort aus dem Browser der Schülerin oder des Schülers direkt per HTTPS an die eingestellte Anmelde-Adresse (`wettbewerb.informatik-biber.de`) – genau das, was beim manuellen Einfügen passiert. Der Portal-Server selbst nimmt keinen Kontakt zum Biber auf. Die Content-Security-Policy erlaubt Formulare nur an das Portal selbst und an die Herkunft der Anmelde-Adresse.

## Projektstruktur

```
server.js            Routen, Sitzung, Sicherheit
lib/oidc.js          IServ-OpenID-Connect-Client (Code-Flow + PKCE)
lib/store.js         verschlüsselter Datenspeicher
lib/importer.js      CSV/XLSX-Import mit Spaltenerkennung
lib/phase.js         Phasenlogik (Europe/Berlin)
lib/views.js         Start- und Schüleransicht
lib/admin-views.js   Verwaltung und Import-Vorschau
lib/teacher.js       Erkennung von Lehrkräften, Gruppen
lib/teacher-views.js Kartendruck (A4-Bögen)
public/              CSS (Aurora/Glas, Maxe-Grün + MINT-EC-Gelb), JS, Favicon
public/img/          Schullogo und MINT-EC-Logo (jeweils Hell-/Dunkelvariante)
tools/mock-iserv.js  lokaler Test-IServ
test/                node:test (Unit + E2E)
```
