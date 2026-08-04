1.
2. ~~Failed sign up attempt \> text fields resets~~
3. ~~Teach a course \> Be a tutor~~
4. ~~Redsign student dashboard~~
5. ~~Implement notification.~~ ✅ Full system — `Notification` + `PushSubscription` models, `createNotification()` helper (DB row + web-push), bell UI in navbar (badge, dropdown, mark-as-read), and triggers on tutor-match/reject/refund/wallet-adjust.
6. <span style="color:#2563eb;">**[Decision: keep as-is — no action needed]**</span> Find a tutor \> remove faculty name / field (optional) \> remove. **Intent: the optional `facultyName` field on the tutor expertise form is to be removed (and stop displaying it on tutor cards). The filter dropdowns on /find-tutor are unaffected.**
7. ~~Consultancy should require login.~~
8. ~~Home \>change text: Meet a few of our top NSUers \> Meet a few of our top Tutors~~
9. ~~Sign in form \> eye button need to implement there~~
10. ~~Student \> dashboard \> tuition request \> date picker \> previous date disabled~~
11. ~~Sign up at privacy policy concern (student / tutor )~~ ✅ Required checkbox + `/privacy-policy` placeholder page added.
12. ~~Approximate budget field \- hide the wheel~~
13. ~~Student dashboard \> offer course \> add new expertise form \> remove filed \[ your overall cgpa \]~~
14. [northsouth.edu](http://northsouth.edu) / any other mail must have for new registration and a email otp code for confirmation.
15. ~~Student dashboard \> offer course \> add new expertise form \> availability \> add user instruction to set the time range~~
16. ~~Student dashboard \> offer course \> add new expertise form \> availability \> add user instruction to set the time range need to change the button color~~
17. ~~Student \> dashboard \> wallet \> remove test mod & button color fixed~~
18. ~~Student \> dashboard \> wallet \> your mfs number \> set 11 digit number and unable to write text~~
19. ~~Left nav bar need to showing 100vh~~
20. ~~Student \> Dashboard \> highlight balance~~
21. ~~Dashboard \> redesign teaching~~

    ### 30 july,2026

22. ~~Sign-up page button color~~
23. ~~Free consultancy \> Title of the sections \> Example: **Your Identity** \- those fields are needed to remove.~~
24. **~~Verify link after registration \- Priority \- High~~**
25. ~~Register page \> showing loading…… text need to remove~~
26. ~~After login \> free consultancy button on navbar need to outline button~~
27. ~~Free consultancy \> per student get 2 free consultancy~~
28. ~~Free consultancy required login~~
29. ~~During Logout, some text are benign are shown , which need to reduce~~
30. ~~After submitting a consultancy a request \> a follow up email will send \> Text : we will contact you soon. (I think should be like after confirmation we should mail him from admin, Currently showing a toast)~~

31. **Refund policy \-**  
    **~~1\. After submitting a refund request from the user, the admin will verify it. If admin approved, the refunded amount transfers to users wallet.~~**
    **~~2.During withdrawal requests don’t validate the front-end side only, always cross check from the backend.~~**
    **~~3.Admin can directly increase / reduce the wallet balance, the user will be notified and the reason will also be saved in transaction history.~~** ✅ `adjustUserBalance` (`src/app/actions/admin.ts`) — atomic balance change + `ADMIN_ADJUSTMENT` transaction row with reason + push notification + email to user.

**\- First Priority \- High**

### 31 july, 2026

32. **~~Free consultancy \- request count left \- Priority \- Medium~~**
33. ~~Earnings and Withdrawal \> after submitting a withdrawal request display a message~~  
    ~~“Your requested withdrawal amount will be credited to your provided account in the next three days.~~
34. ~~Earnings and Withdrawal \> Transfer Type dropdown remove \- replace with the tutorial text “only send money “ , add bank as withdrawal options (for saving money with BFTN option).~~
35. ~~Redesign Student Dashboard specially \- Payments, earnings and withdrawals , wallets \-  
    try to combine these three sidebar options inside into a single tab.~~ ✅ Unified **Money** hub at `/wallet` — gradient KPI hero + 3 tabs (Wallet / Payments / Earnings). Old routes kept for deep links.
36. **Refund \- students get only the course price but not the platform fee. \- priority high**
37. **Refunded amount initially will send to users nsuone wallet.\- priority high**
38. ~~**While signed in, user can not see any sign up / sign in page, He / she will redirect to home page \- Priority (Medium)**~~ ✅ Implemented — redirects to `/dashboard` (per clarification).

### 02 aug, 2026

39.
