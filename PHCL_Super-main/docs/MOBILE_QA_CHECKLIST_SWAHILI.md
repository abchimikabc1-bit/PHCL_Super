# PHCL Super — Mobile QA Checklist (Swahili)

Checklist hii ni ya haraka (dakika 2–5) kwa kujaribu app kwenye simu kabla ya kuendelea na hatua nyingine.

## 1) Kuwasha kwenye simu

- [ ] Hakikisha laptop na simu ziko kwenye Wi‑Fi moja.
- [ ] Washa app kwenye laptop (**rahisi zaidi:** `npm run dev:mobile`).
- [ ] Njia mbadala: `npm run dev:lan`.
- [ ] Tafuta IPv4 ya laptop (kwa `ipconfig`) kisha fungua kwenye simu:
  - `http://<IP_YA_LAPTOP>:3000/exchange`
  - Mfano: `http://192.168.1.20:3000/exchange`

## 2) Exchange page (muonekano + data)

- [ ] Page inafunguka bila crash.
- [ ] Muonekano wa rangi za premium unaonekana vizuri, maandishi yanasomeka.
- [ ] GCV line ipo wazi: **`1 PI = $314,159 GCV`**.
- [ ] Live status inaonekana (live/fallback) bila kuvunja layout.
- [ ] Converter inabadilisha thamani kwa usahihi (USD ↔ BTC, USD ↔ TZS, n.k).

## 3) Wallet + Voice Accessibility

- [ ] Nenda `/wallet` na hakikisha page inapakia vizuri.
- [ ] Badili lugha SW/EN; maandishi yabadilike sahihi.
- [ ] Voice assist isome kwa lugha iliyochaguliwa bila kuchanganya lugha.

## 4) Checkout + Mobile payments

- [ ] Nenda `/checkout` na jaribu flow ya kawaida.
- [ ] Kwa TZS/nTZS, sehemu ya mtandao wa simu inaonekana.
- [ ] Chagua mtandao + namba ya malipo, validation ifanye kazi.
- [ ] Complete purchase inafanikiwa bila error ya UI.

## 5) Orders verification

- [ ] Nenda `/orders`.
- [ ] Hakikisha inaonyesha:
  - Mobile Network
  - Payment Phone
  kwa order zilizotumia malipo ya mtandao wa simu.

## 6) Responsive checks (simu)

- [ ] Buttons hazikatiki wala ku-overlap.
- [ ] Inputs/selects zinafanya kazi kwa touch.
- [ ] Hakuna text ndogo kupita kiasi.
- [ ] Scroll ni laini bila section kuvunjika.

## 7) Ikiwa haifunguki kwenye simu

- [ ] Ruhusu Node/port `3000` kwenye Windows Firewall.
- [ ] Hakikisha dev server inasikiliza nje ya localhost (0.0.0.0).
- [ ] Jaribu kuzima VPN kwenye simu/laptop.
- [ ] Hakikisha URL ni sahihi: `http://<IP_YA_LAPTOP>:3000/...`

## 8) Uthibitisho wa mwisho (Pass/Fail)

- Exchange visual/readability: [ ] PASS  [ ] FAIL
- Live refresh/source status: [ ] PASS  [ ] FAIL
- Wallet SW/EN + Voice: [ ] PASS  [ ] FAIL
- Checkout mobile network flow: [ ] PASS  [ ] FAIL
- Orders mobile metadata display: [ ] PASS  [ ] FAIL
- Overall mobile readiness: [ ] PASS  [ ] FAIL

---

### Notes

- Jaza matokeo ya PASS/FAIL kwa kila sehemu.
- Ukiona issue, andika route, screenshot, na hatua za kurudia issue.
