[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# CommonGround

CommonGround is a community-governed student support fund where private requests stay encrypted and no single steward can decide who receives help.

Built with TideCloak, React, Vite and Express.

## 1. Vision & originality

Students often avoid asking for emergency help when one administrator can read their story and control the outcome. CommonGround lets students request small grants while a community panel decides together.

## 2. Trust constraint insight

A conventional fund puts sensitive requests and final authority in one database administrator. CommonGround encrypts the explanation in the student's TideCloak session before the API receives it. The API stores ciphertext, and only accounts with TideCloak's `commons-case` decryption permission can ask the distributed Tide network to reveal it.

## 3. Value & impact

Students can seek transport, food, course-material or emergency support without making the private explanation readable to the app server. A request needs two matching votes from three independent stewards; requesters cannot vote on their own case. A split with an abstention closes without a decision.

## 4. Why TideCloak matters

Ordinary login and API roles cannot decrypt a stored explanation. TideCloak performs encryption and decryption through its distributed network, so the application server stores no decryption key. The Express API also verifies Tide JWTs and DPoP proofs and enforces the steward quorum for decisions.

## 5. Prototype & storytelling

Submit a synthetic request, inspect its sealed state, then sign in as stewards to reveal it through TideCloak and vote. Show that one vote leaves the request pending and the second matching vote decides it. The quorum is application logic in this prototype; it is not a custom Forseti policy, and the prototype does not move real money or connect to university records.

## Run locally

Requirements: Node.js 20+, npm, a TideCloak realm and public client. Configure redirect URI `http://localhost:5137/auth/redirect` and web origin `http://localhost:5137`.

Create realm roles `member` and `steward` (stewards also need `member`), plus Tide encryption roles `_tide_commons-case.selfencrypt` and `_tide_commons-case.selfdecrypt`. Assign encryption roles only to intended users. Copy the exported public adapter to the ignored path `public/tidecloak.json`; do not commit secrets.

```powershell
npm.cmd ci
npm.cmd run dev:api
```

In a second terminal:

```powershell
npm.cmd run dev
```

Open `http://localhost:5137`. Run verification with `npm.cmd run check`.
