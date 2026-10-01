# Biber-Portal

Schülerinnen und Schüler melden sich mit ihrem **IServ-Konto (Single-Sign-On, OpenID Connect)** an, sehen ihre **Zugangsdaten für den Informatik-Biber** (Benutzername und Passwort, einzeln kopierbar) und kommen mit einem Klick zur **Anmeldung** bzw. zum **Schnupper-Biber**. Welche Weiterleitung im Vordergrund steht, ergibt sich automatisch aus den Wettbewerbsdaten oder wird manuell gesetzt.

## Funktionen

**Schüleransicht**
- Anmeldung nur über IServ; das IServ-Passwort sieht das Portal nie.
- Drei Schritte: Benutzername kopieren → Passwort kopieren (verdeckt, per Auge sichtbar) → „Zum Schnupper-Biber“ bzw. „Zum Wettbewerb anmelden“ (neuer Tab).
- Phasenkarte mit Countdown bis zu den Biberwochen und Zeitleiste; Zugangskarte druckbar.
- Ohne hinterlegte Daten erscheint ein freundlicher Hinweis an die Lehrkraft.

**Verwaltung** (nur Accounts aus `ADMIN_ACCOUNTS`)
- Import des Biber-Exports als **CSV oder Excel (.xlsx)** mit zusätzlicher Spalte **`IServ`** (Accountname). Vorschau mit Prüfhinweisen, dann „Ergänzen“ oder „Ersetzen“.
- Tabelle mit Suche/Filter, Zuordnung per Accountname direkt nachtragen, Vorschau „als Schüler:in“, Abrufstatus.
- **Einzelne Zugänge per Formular** anlegen (Bereich „Einzeln.“, mit „Anlegen & nächster“ für mehrere hintereinander) und jeden Eintrag über das Stift-Symbol bearbeiten (Name, Klasse, Benutzername, Passwort, IServ-Account). Doppelte Benutzernamen oder IServ-Accounts werden abgewiesen; Abrufzähler bleiben beim Bearbeiten erhalten.
- Phase (automatisch/manuell), Termine, Ziel-Adressen, Hinweistext, Schalter „Zugangsdaten sichtbar“.
- Nach dem Wettbewerb: alle Zugangsdaten endgültig löschen.

## Ablauf für die Lehrkraft

1. In der Biber-Verwaltung (admin.informatik-biber.de) die Zugangsdaten als Excel oder CSV herunterladen.
2. Spalte **`IServ`** ergänzen und je Zeile den IServ-Accountnamen eintragen, z. B. `max.mustermann`. (Groß-/Kleinschreibung und ein angehängtes `@domain` werden ignoriert.)
3. Im Portal unter **Verwaltung → Import** hochladen, Vorschau prüfen, übernehmen.
4. Offene Zuordnungen in der Tabelle nachtragen. Über das Auge-Symbol die Ansicht einer Schülerin/eines Schülers prüfen.

Erkannte Spaltenköpfe (tolerant): `Benutzername`, `Passwort`, `IServ` / `IServ-Account` / `Account`, `Vorname`, `Nachname`, `Klassen-/Kursname` / `Klasse`, `Stufe`. Titelzeilen oberhalb der Kopfzeile, Semikolon/Komma/Tab sowie UTF-8 und Windows-1252 (Excel-CSV) werden erkannt. Eine Vorlage gibt es in der Verwaltung.

## IServ einrichten (Single-Sign-On)

In IServ als Administrator: **Verwaltung → System → Single-Sign-On → Hinzufügen** (OAuth/OpenID Connect):

| Feld | Wert |
|---|---|
| Name | Biber-Portal |
| Client-ID / Client-Geheimnis | frei wählen bzw. übernehmen → in `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` |
| Weiterleitungs-URI | `https://<Ihre-Portal-Adresse>/auth/callback` |
| Grant-Typ | Authorization Code |
| Scopes | `openid`, `profile`, `email` |
| Vertrauenswürdig | ja (dann entfällt die Zustimmungsabfrage) |
| Beschränkung auf Gruppen/Rollen | optional, z. B. nur Schüler:innen + Informatik-Lehrkräfte |

Die Nutzer:innen brauchen in IServ das Recht **„OAuth verwenden“**. Das Portal liest die Endpunkte automatisch aus `https://<iserv>/.well-known/openid-configuration`, prüft das ID-Token (Signatur, Aussteller, Zielgruppe, Nonce), nutzt PKCE und ordnet über den Claim `preferred_username` (= IServ-Accountname) zu.

## Deployment mit CapRover

1. Neue App anlegen, HTTPS aktivieren, **Persistent Directory** `/app/data` einrichten.
2. Umgebungsvariablen aus `.env.example` setzen (mindestens `BASE_URL`, `ISERV_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `ADMIN_ACCOUNTS`, `SESSION_SECRET`, `DATA_KEY`). Geheimnisse erzeugen: `openssl rand -base64 48`.
3. Container-HTTP-Port: **80**. Deploy per `caprover deploy` oder Tarball (`captain-definition` liegt bei).

**Wichtig:** `DATA_KEY` nie ändern – die Zugangsdaten sind damit verschlüsselt (AES-256-GCM) gespeichert.

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

Im Mock-IServ gibt es u. a. `max.mustermann`, `erika.musterfrau`, `lena.ohnedaten` und den Admin `andre.bodendiek`.

## Datenschutz und Sicherheit

- Gespeichert werden nur: Biber-Benutzername, Biber-Passwort, IServ-Accountname, Name/Klasse aus dem Export sowie Abrufzeitpunkte. IServ-Tokens werden nicht gespeichert.
- Datenspeicher vollständig verschlüsselt; Sitzungscookie signiert, `HttpOnly`, `SameSite=Lax`, `Secure` unter HTTPS; CSRF-Schutz für alle Formulare; strikte Content-Security-Policy; Seiten mit Zugangsdaten werden nicht zwischengespeichert (`no-store`).
- Nach dem Wettbewerb lassen sich alle Zugangsdaten in der Verwaltung mit einem Schritt löschen.
- Eine automatische Anmeldung beim Informatik-Biber (Zugangsdaten an fremde Seite senden) ist bewusst nicht eingebaut – das Portal zeigt die Daten und leitet weiter.

## Projektstruktur

```
server.js            Routen, Sitzung, Sicherheit
lib/oidc.js          IServ-OpenID-Connect-Client (Code-Flow + PKCE)
lib/store.js         verschlüsselter Datenspeicher
lib/importer.js      CSV/XLSX-Import mit Spaltenerkennung
lib/phase.js         Phasenlogik (Europe/Berlin)
lib/views.js         Start- und Schüleransicht
lib/admin-views.js   Verwaltung und Import-Vorschau
public/              CSS (Aurora/Glas), JS, Favicon
tools/mock-iserv.js  lokaler Test-IServ
test/                node:test (Unit + E2E)
```
