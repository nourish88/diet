# Complete Testing Guide - Diet Mobile & Web App

## 🎯 What We've Achieved

### ✅ Completed Features

1. **Mobile App (React Native + Expo)**

   - Client and Dietitian authentication (Supabase)
   - Reference code system for client registration
   - Pending approval workflow
   - Diet viewing and management
   - Comments on diets/meals
   - Meal photo upload (stored in database)
   - Local meal reminder notifications
   - FREE WhatsApp integration

2. **Web App Enhancements**

   - Pending clients approval page
   - Reference code matching system
   - FREE WhatsApp integration for diet sharing
   - Multi-dietitian support (database ready)

3. **Backend APIs**
   - User authentication sync
   - Reference code generation
   - Pending clients management
   - Comments API
   - Meal photos API
   - WhatsApp URL generation (FREE)

---

## 📋 Step-by-Step Testing

### **PART 1: Web App Testing**

#### Test 1: Verify Web App is Running

```bash
# Check if Next.js is running
lsof -ti:3000
# If running, open: http://localhost:3000
```

**Expected Result:**

- Web app loads successfully
- You can see the navigation menu

---

#### Test 2: Check Existing Clients

1. Go to: http://localhost:3000/clients
2. Verify you can see your existing clients list
3. Click on any client to view details

**Expected Result:**

- Client list displays with names, phone numbers
- Client detail page shows diet history

---

#### Test 3: Check Existing Diets

1. Go to: http://localhost:3000/diets
2. Click on any diet to view details
3. Look for the "📱 WhatsApp" button

**Expected Result:**

- Diet details display correctly
- WhatsApp button is visible next to PDF button

---

#### Test 4: Test WhatsApp Integration (Web)

1. Open any diet: http://localhost:3000/diets/[id]
2. Click "📱 WhatsApp" button
3. Check if WhatsApp opens (web.whatsapp.com or WhatsApp desktop)

**Expected Result:**

- WhatsApp opens in new tab/window
- Message is pre-filled with:

  ```
  Merhaba [Client Name]! 👋

  Yeni beslenme programınız hazır 📋

  Tarih: [Diet Date]

  Mobil uygulamadan detayları görebilirsiniz.
  ```

- You can manually click "Send" to deliver the message

**Note:** If client doesn't have a phone number, the button will be disabled.

---

#### Test 5: Pending Clients Page (Web)

1. Go to: http://localhost:3000/pending-clients
2. Check the page layout

**Expected Result:**

- Page shows "Pending Client Approvals" title
- Two sections:
  - "Waiting for Approval" (list of pending users)
  - "Match with Existing Client" (matching form)
- Currently, the pending list should be empty (no mobile registrations yet)

---

### **PART 2: Mobile App Testing**

#### Test 6: Verify Mobile App is Running

```bash
# Check if Expo is running
lsof -ti:8082
# If running, scan QR code or open: http://localhost:8082
```

**Expected Result:**

- Expo dev server is running
- You can see QR code in terminal (for physical device)
- Or press 'w' to open in web browser

---

#### Test 7: Mobile Registration (Client)

1. Open mobile app
2. You should see Login/Register screen
3. Click "Register" or "Sign Up"
4. Fill in:
   - Email: `testclient@gmail.com` (use valid format)
   - Password: `password123`
   - **Note:** Role is automatically set to "client"
5. Click "Register"

**Expected Result:**

- Alert appears showing:

  ```
  Registration Successful!
  Your reference code is:

  REF-XXXXXX

  Please send this code to your dietitian to activate your account.
  ```

- You can tap "Copy Code" to copy the reference code
- **IMPORTANT:** Save this reference code! You'll need it for approval.

---

#### Test 8: Pending Approval Screen (Mobile)

1. After registration, you should automatically see a "Pending Approval" screen
2. The screen shows:
   - Your reference code
   - "Copy Code" button
   - Instructions to send code to dietitian
   - "Refresh Status" button

**Expected Result:**

- Cannot access diet list until approved
- Reference code is displayed clearly
- Can copy code to clipboard

---

#### Test 9: Approve Client (Web)

1. Go back to web app: http://localhost:3000/pending-clients
2. You should now see the new registration in "Waiting for Approval" table
3. In the "Match with Existing Client" section:
   - Select an existing client from dropdown
   - Enter the reference code from mobile registration (e.g., REF-XXXXXX)
   - Click "Confirm Match & Approve"

**Expected Result:**

- Success message appears
- Page refreshes
- The pending user disappears from the list
- The selected client is now linked to the mobile user

---

#### Test 10: Client Access After Approval (Mobile)

1. Go back to mobile app
2. Tap "Refresh Status" button (or restart the app)
3. You should now see the client's diet list

**Expected Result:**

- Pending approval screen disappears
- Client can now see their diets
- Can view diet details
- Can add comments
- Can upload meal photos

---

#### Test 11: View Diet Details (Mobile - Client)

1. Tap on any diet from the list
2. View the diet details

**Expected Result:**

- Diet date, target, result displayed
- Meals (Öğünler) listed with times
- Food items with quantities
- Can scroll through all meals

---

#### Test 12: Add Comment (Mobile - Client)

1. In diet detail screen, scroll to bottom
2. Find "Add Comment" section
3. Type a comment (e.g., "Bu öğünü çok sevdim!")
4. Tap "Submit"

**Expected Result:**

- Comment appears in the list
- Shows your name and timestamp
- Can see all previous comments

---

#### Test 13: Upload Meal Photo (Mobile - Client)

1. In diet detail screen, find "Upload Meal Photo" section
2. Tap "Take Photo" or "Choose from Gallery"
3. Select/take a photo
4. Photo uploads

**Expected Result:**

- Photo appears in the meal photos section
- Shows upload timestamp
- Photo is stored in database (not Firebase)

---

#### Test 14: Dietitian Login (Mobile)

1. Logout from client account
2. Register a new account with email: `dietitian@gmail.com`
3. **Note:** This will create a client account by default
4. For now, you can test with the web app for dietitian features

**Alternative:** You can manually update the database to change a user's role to "dietitian"

---

#### Test 15: WhatsApp Integration (Mobile - Dietitian)

**Note:** This requires a dietitian account. If you've set one up:

1. Login as dietitian in mobile app
2. Go to client list
3. Tap on a client
4. Find a diet card
5. Tap "📱 WhatsApp" button

**Expected Result:**

- WhatsApp app opens on your phone
- Message is pre-filled
- You can tap "Send" to deliver

---

### **PART 3: Database & Backend Testing**

#### Test 16: Check Database Schema

```bash
cd /Users/nuriaktas/Desktop/projects/diet/diet
npx prisma studio
```

**Expected Result:**

- Prisma Studio opens in browser
- You can see these tables:
  - User (with referenceCode, isApproved fields)
  - Client (with userId field)
  - Diet
  - DietComment
  - MealPhoto
  - NotificationPreference

---

#### Test 17: Verify Reference Code Generation

1. In Prisma Studio, open "User" table
2. Find the client you registered
3. Check fields:
   - `referenceCode` should have value like "REF-XXXXXX"
   - `isApproved` should be `true` (after approval)
   - `approvedAt` should have timestamp
   - `role` should be "client"

---

#### Test 18: Check Client Linking

1. In Prisma Studio, open "Client" table
2. Find the client you matched
3. Check `userId` field - should match the User ID

---

#### Test 19: Test API Endpoints Manually

**Test WhatsApp URL Generation:**

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-diet \
  -H "Content-Type: application/json" \
  -d '{"clientId": 1, "dietId": 1}'
```

**Expected Result:**

```json
{
  "success": true,
  "message": "WhatsApp URL generated successfully",
  "whatsappURL": "https://wa.me/905551234567?text=...",
  "clientName": "Client Name",
  "dietDate": "24 Mart 2025"
}
```

**Test Pending Clients List:**

```bash
curl http://localhost:3000/api/pending-clients
```

**Expected Result:**

```json
{
  "users": [
    {
      "id": 1,
      "email": "testclient@gmail.com",
      "referenceCode": "REF-XXXXXX",
      "isApproved": false,
      "createdAt": "2025-01-..."
    }
  ]
}
```

---

### **PART 4: Notification Testing**

#### Test 20: Set Meal Reminders (Mobile)

1. In mobile app, go to Settings (if available)
2. Or check if notifications are automatically scheduled
3. Set a meal time for 1-2 minutes in the future

**Expected Result:**

- Notification appears 30 minutes before meal time
- Shows meal name and time
- Tapping notification opens the app

**Note:** Local notifications work even when app is closed.

---

## 🐛 Common Issues & Solutions

### Issue 1: "Port already in use"

**Solution:**

```bash
# Kill Next.js
kill -9 $(lsof -ti:3000)

# Kill Expo
kill -9 $(lsof -ti:8082)

# Restart
npm run dev  # for Next.js
cd mobile && npx expo start  # for mobile
```

### Issue 2: "Supabase email invalid"

**Solution:** Use a valid email format like `test@gmail.com`, not `test@example.com`

### Issue 3: "Client phone number not found"

**Solution:** Make sure the client in the database has a valid phone number

### Issue 4: WhatsApp doesn't open

**Solution:**

- Check if WhatsApp is installed
- Verify phone number format (should include country code)
- Try with a real phone number

### Issue 5: Mobile app won't load

**Solution:**

```bash
cd mobile
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue 6: Reference code not showing

**Solution:** Check `mobile/.env` file has correct API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## 📊 Testing Checklist

### Web App

- [ ] Web app loads on http://localhost:3000
- [ ] Can view clients list
- [ ] Can view diets list
- [ ] Can view diet details
- [ ] WhatsApp button works on diet page
- [ ] WhatsApp opens with pre-filled message
- [ ] Pending clients page loads
- [ ] Can match client with reference code

### Mobile App

- [ ] Mobile app loads on Expo
- [ ] Can register new client account
- [ ] Reference code is generated and displayed
- [ ] Pending approval screen shows
- [ ] After approval, can access diets
- [ ] Can view diet details
- [ ] Can add comments
- [ ] Can upload meal photos
- [ ] WhatsApp button works (if dietitian)

### Backend

- [ ] Database has all required tables
- [ ] Reference codes are unique
- [ ] User approval workflow works
- [ ] Client linking works
- [ ] API endpoints respond correctly
- [ ] WhatsApp URL generation works

### Integration

- [ ] Web → Mobile: Registration and approval flow
- [ ] Mobile → Database: Comments and photos saved
- [ ] Web → WhatsApp: Diet notification sent
- [ ] Mobile → WhatsApp: Diet notification sent

---

## 🎉 Success Criteria

You've successfully tested everything if:

1. ✅ Client can register in mobile app and receive reference code
2. ✅ Dietitian can approve client in web app using reference code
3. ✅ Approved client can view diets in mobile app
4. ✅ Client can add comments and upload photos
5. ✅ Dietitian can send diet notifications via WhatsApp (web)
6. ✅ WhatsApp opens with pre-filled message (FREE, no API costs)
7. ✅ All data is stored in PostgreSQL database

---

## 📞 Need Help?

If you encounter any issues during testing:

1. Check the browser console (F12) for errors
2. Check the terminal for server errors
3. Check Expo logs for mobile errors
4. Verify environment variables are set correctly
5. Make sure both servers are running (Next.js + Expo)

---

## 🚀 Next Steps After Testing

Once testing is complete, you can:

1. Deploy the web app to Vercel
2. Build mobile app for iOS/Android
3. Set up production database
4. Configure production Supabase project
5. Add more features (bulk WhatsApp, SMS fallback, etc.)

---

**Happy Testing! 🎊**





