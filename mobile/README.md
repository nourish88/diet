# Diet Mobile App

React Native mobile application for dietitians and clients built with Expo.

## Features

### For Dietitians

- View all assigned clients
- View client details and diet history
- Create and manage diet plans
- View and respond to client comments
- View meal photos uploaded by clients

### For Clients

- View all diet plans
- View detailed meal plans with times
- Comment on diets and specific meals
- Upload meal photos
- Schedule meal reminders (30 min before each meal)

## Tech Stack

- **React Native** with Expo
- **Expo Router** for file-based routing
- **Supabase** for authentication
- **TanStack Query** for data fetching
- **Expo Notifications** for local notifications
- **Expo Image Picker** for photo uploads
- **TypeScript** for type safety

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `mobile` directory:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Create Dietitian Account

#### Step 1: Create in Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Email: `your-dietitian-email@example.com`
4. Password: Create a strong password
5. Auto-confirm user: Yes
6. Copy the User ID (UUID)

#### Step 2: Sync with Database

Use the admin API endpoint to sync the dietitian and assign all existing clients:

```bash
curl -X POST http://localhost:3000/api/admin/sync-dietitian \
  -H "Content-Type: application/json" \
  -d '{
    "supabaseId": "YOUR-SUPABASE-USER-ID",
    "email": "your-dietitian-email@example.com"
  }'
```

This will:

- Create a User record in the database
- Assign all existing clients to this dietitian
- Assign all existing diets to this dietitian

### 4. Run the App

```bash
# Start Expo server
npm start

# Or for specific platforms
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

### 5. Test the App

#### Test Dietitian Login

1. Open the app
2. Login with dietitian credentials
3. Should see client list
4. Tap a client to view details
5. View diet history

#### Test Client Registration

1. Open the app
2. Tap "Register"
3. Fill in email and password
4. Should register as client automatically
5. Should see empty diet list

#### Test Client Login

1. Login with existing client credentials
2. Should see their diet plans
3. Tap a diet to view details
4. Try adding a comment
5. Try uploading a meal photo
6. Try scheduling meal reminders

## Project Structure

```
mobile/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (dietitian)/         # Dietitian screens
│   │   ├── index.tsx        # Client list
│   │   └── clients/[id].tsx # Client detail
│   ├── (client)/            # Client screens
│   │   ├── index.tsx        # Diet list
│   │   └── diets/[id].tsx   # Diet detail
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── services/
│   ├── api.ts               # API client
│   ├── auth.ts              # Authentication service
│   ├── notifications.ts     # Notification service
│   └── storage.ts           # Image storage service
├── hooks/
│   └── useAuth.ts           # Authentication hook
├── types/
│   └── index.ts             # TypeScript types
└── .env                     # Environment variables
```

## API Endpoints Used

### Authentication

- `POST /api/auth/sync` - Sync Supabase user with database

### Clients

- `GET /api/clients?dietitianId=X` - Get clients for dietitian
- `GET /api/clients/:id` - Get client details

### Diets

- `GET /api/diets?clientId=X` - Get diets for client
- `GET /api/diets?dietitianId=X` - Get diets for dietitian
- `GET /api/diets/:id` - Get diet details
- `POST /api/diets` - Create new diet
- `PUT /api/diets/:id` - Update diet

### Comments

- `GET /api/comments?dietId=X` - Get comments for diet
- `POST /api/comments` - Create comment
- `DELETE /api/comments/:id` - Delete comment

### Meal Photos

- `GET /api/meal-photos?dietId=X` - Get photos for diet
- `POST /api/meal-photos` - Upload photo (base64)

### Admin

- `POST /api/admin/sync-dietitian` - Sync dietitian and assign clients

## Key Features Implementation

### Authentication Flow

1. User logs in with Supabase
2. App syncs user data with backend
3. Backend returns user with role and client info
4. App redirects to appropriate screen based on role

### Meal Reminders

- Uses Expo Notifications for local notifications
- Schedules notifications 30 min before each meal
- Repeats daily
- Requires notification permissions

### Photo Upload

- Uses Expo Image Picker for camera/gallery access
- Compresses images to base64
- Stores directly in PostgreSQL database
- Auto-deletes after 30 days

### Comments System

- Supports comments on:
  - Entire diet
  - Specific meals
  - Specific menu items
- Real-time updates with TanStack Query
- Shows author role (dietitian vs client)

## Backward Compatibility

The mobile app is designed to work alongside the existing web application:

- Web app continues to work without changes
- New diets created in web automatically assigned to dietitian
- Mobile app filters data by dietitian
- No breaking changes to existing functionality

## Troubleshooting

### QR Code Not Showing

- Make sure Expo server is running
- Check that your phone and computer are on the same WiFi
- Try using tunnel mode: `npx expo start --tunnel`

### Authentication Errors

- Verify Supabase credentials in `.env`
- Check that dietitian account exists in Supabase
- Verify dietitian is synced with database

### API Connection Issues

- Verify `EXPO_PUBLIC_API_URL` in `.env`
- Make sure Next.js backend is running
- Check network connectivity

### Notification Not Working

- Request notification permissions
- Check device notification settings
- Verify meal times are in correct format (HH:MM)

## Future Enhancements

- [ ] Diet creation in mobile app
- [ ] Push notifications for diet updates
- [ ] Offline support
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Analytics dashboard
- [ ] Export diet as PDF from mobile

## Support

For issues or questions, please contact the development team.
