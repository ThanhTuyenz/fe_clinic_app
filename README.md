# VitaCare Clinic Mobile

## Android development build

```powershell
npx eas-cli@latest build --platform android --profile development
```

Cài APK từ EAS lên điện thoại, rồi chạy Metro trên máy:

```powershell
npx expo start --dev-client
```

Điện thoại và máy chạy backend/Metro cần truy cập được nhau qua mạng. Mặc định app development tự lấy IP máy từ Metro và gọi backend ở cổng 8011.

## Google Sign-In

Android dùng hộp chọn tài khoản native, sau đó gửi ID Token tới `POST /api/v1/auth/google`. Web giữ luồng OAuth redirect. iOS chưa được cấu hình Google Sign-In.

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` phải là **Web Client ID** cùng giá trị `GOOGLE_CLIENT_ID` của backend. Không đưa Client Secret vào app.
- Android OAuth Client phải khớp package `com.vitacare.clinic` và SHA-1 của keystore ký APK. Dùng `npx eas-cli@latest credentials --platform android` để xem SHA-1 trên EAS.
- Expo Go không hỗ trợ thư viện Google Sign-In native. Sau khi thêm hoặc nâng cấp thư viện native, cần build và cài lại APK; sửa giao diện/logic TypeScript có thể dùng Fast Refresh.
