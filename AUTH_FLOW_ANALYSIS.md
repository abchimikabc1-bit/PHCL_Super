

### CURRENT (BROKEN) FLOW:
1. User visits homepage → sees Login/Signup buttons
2. User clicks Signup → fills form
3. Signup saves user to localStorage → redirects to LOGIN (?)
4. User sees login page (confusing - they just signed up!)
5. User clicks "Already have account? Log in" 
6. Login saves ONLY email (different data structure!)
7. Login redirects to /chat
8. Chat page opens

### THE PROBLEMS:
1. **Signup → Login redirect is wrong**: User just created account, should go directly to chat
2. **Data mismatch**: Signup stores {name, email, phone, createdAt}, Login stores {email only}
3. **Duplicate save**: Both signup and login write to same localStorage.user key
4. **No validation**: Login doesn't check if email matches any signup records

### CORRECT FLOW SHOULD BE:
1. Homepage checks if user exists → if yes, go to chat; if no, show auth
2. Signup → save full user data → go DIRECTLY to chat (auto-logged in)
3. Login → validate email exists in signup data → go to chat
4. Logout → clear localStorage → go back to homepage

### FIXES NEEDED:
- Fix signup to redirect to /chat, not /login
- Standardize localStorage user data structure
- Add validation between signup and login
- Update login to use consistent data format
