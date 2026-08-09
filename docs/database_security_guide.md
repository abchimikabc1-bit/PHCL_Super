# Mwongozo wa Usalama na Ulinzi Madhubuti wa Database (Database Security & Protection Guide)

Mwongozo huu unatoa hatua kwa hatua jinsi ya kuanzisha, kupima (test), na kutekeleza sheria za ulinzi kwenye **Firebase Firestore** na **SQL Databases (PostgreSQL)**.

---

## 1. Firebase Firestore Security Rules

### A. Jinsi ya Kujaribu (Test) Rules kwa Firebase Emulator
Kabla ya kuweka sheria hizo kwenye Production, zipime kwenye mazingira ya Emulator:

1. **Washa Firebase Emulator**:
   ```bash
   npx -y firebase-tools@latest emulators:start --only firestore
   ```
2. **Endesha Unit Tests (kwa Node.js/Jest)**:
   Tumia `@firebase/rules-unit-testing` ili kuthibitisha:
   - Mtumiaji asiyeingia anakuwa **blocked** kusoma au kuandika.
   - Mtumiaji anaweza kusoma na kuandika data yake pekee.
   - Mtumiaji hawezi kujipandishia cheo (Self-assigned admin roles zinalatiliwa).
   - Maneno marefu zaidi ya limit yanatupiliwa mbali.

### B. Deployment ya Rules
Ili kuweka sheria hizo kwenye mradi wako wa Firebase:
```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

---

## 2. SQL Database Protection (PostgreSQL)

### A. Kanuni za Kuzuia SQL Injection
- **Daima tumia Parameterized Queries / Prepared Statements**:
  - ❌ **Kosa (Vulnerable)**: `SELECT * FROM users WHERE email = '` + userInput + `'`;
  - ✅ **Sahihi (Secure)**: `SELECT * FROM users WHERE email = $1;` (parameterized).

### B. Kuanzisha Row-Level Security (RLS)
1. Washa RLS kwenye majedwali yako yote:
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```
2. Tekeleza faili la [sql_security_policies.sql](file:///C:/Users/Hp/.gemini/antigravity/scratch/sql_security_policies.sql) kwenye database yako ya PostgreSQL.

---

## 3. Checklist ya Usalama (Red Team Audit Criteria)

| Kipengele | Hali ya Usalama | Maelezo |
| :--- | :--- | :--- |
| **Authentication Check** | ✅ Secure | Mtumiaji yeyote asiyethibitishwa anakataliwa kiotomatiki (`Deny-by-Default`). |
| **Update Bypass Protection** | ✅ Secure | Kuzuia kubadilisha `uid`, `role`, au `createdAt` wakati wa `update`. |
| **Authority Source** | ✅ Secure | Cheo cha Admin kinahakikiwa kupitia Custom Claims au Secure Role Collection (`/roles/{uid}`). |
| **Resource Exhaustion / DoS** | ✅ Secure | Kuna mipaka ya urefu wa maneno (`isValidString`) kuzuia payload kubwa mno. |
| **Audit Logging** | ✅ Secure | Log zote za audit haziruhusiwi kufutwa au kubadilishwa (`Immutable Logs`). |

---

## Rasi za Ziada (Recommended Actions)
- Pendekezo: Weka subdirectory hii kama active workspace ili uweze kusimamia msimbo huu kwa urahisi.
