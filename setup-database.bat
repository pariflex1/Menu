@echo off
echo ========================================
echo   DATABASE SETUP INSTRUCTIONS
echo ========================================
echo.
echo Step 1: Open Supabase SQL Editor
echo ----------------------------------------
echo Click this link:
echo https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/sql/new
echo.
echo Step 2: Copy the SQL file
echo ----------------------------------------
echo The file 'setup-database.sql' will now open in Notepad.
echo Press Ctrl+A to select all, then Ctrl+C to copy.
echo.
pause
notepad setup-database.sql
echo.
echo Step 3: Paste and Run
echo ----------------------------------------
echo 1. Go back to Supabase SQL Editor (browser)
echo 2. Press Ctrl+V to paste the SQL
echo 3. Click the RUN button (or press Ctrl+Enter)
echo 4. Wait for "Success" message
echo.
echo Step 4: Create Staff User
echo ----------------------------------------
echo Open: https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/auth/users
echo Click: Add user -^> Create new user
echo Email: owner@restaurant.com
echo Password: (choose a secure password)
echo Check: Auto Confirm User
echo.
echo COPY THE USER UUID from the list!
echo.
echo Step 5: Link User to Restaurant
echo ----------------------------------------
echo Open: Table Editor -^> user_profiles -^> Insert
echo Fill in:
echo   user_id: (paste the UUID you copied)
echo   restaurant_id: 11111111-1111-1111-1111-111111111111
echo   name: Restaurant Owner
echo   role: owner
echo Click: Save
echo.
echo Step 6: Start the App
echo ----------------------------------------
echo Run: npm run dev
echo Open: http://localhost:3000/login
echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
pause
