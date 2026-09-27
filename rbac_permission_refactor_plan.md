# Kế Hoạch Nâng Cấp Hệ Thống Phân Quyền RBAC Chuẩn
## (User ➔ Role ➔ Permission) cho VitaCare Clinic

---

## 1. Mục Tiêu Kiến Trúc

Chuyển đổi từ mô hình **Role-Based cố định** sang mô hình **Fine-grained RBAC (Role & Permission)**:
- **Permission (Quyền nguyên tử):** Các hành động độc lập gắn với tài nguyên y tế theo chuẩn `resource:action` (ví dụ: `appointment:cancel`, `prescription:write`).
- **Role (Vai trò cơ bản):** Đóng vai trò là "gói quyền" mặc định (`ADMIN`, `BRANCH_MANAGER`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`).
- **User Custom Permissions (Tùy biến quyền người dùng):** Cho phép Admin cấp thêm quyền cộng (`granted`) hoặc tước bỏ quyền (`revoked`) trực tiếp trên từng tài khoản nhân sự (giải quyết triệt để tình huống *Lễ tân thử việc* và *Bác sĩ kiêm quản lý*).

$$\text{Effective Permissions} = (\text{Role Base Permissions} \cup \text{Granted}) \setminus \text{Revoked}$$

---

## 2. Danh Mục Quyền Hạn Chuẩn Y Tế (VitaCare Permission Catalog)

| Nhóm Tài Nguyên | Mã Quyền (`code`) | Tên Quyền | Quyền Mặc Định Của Role |
| :--- | :--- | :--- | :--- |
| **Lịch Hẹn** | `appointment:read` | Xem danh sách & chi tiết lịch khám | ADMIN, MANAGER, DOCTOR, RECEPTIONIST |
| | `appointment:create` | Đặt lịch khám mới tại quầy | ADMIN, MANAGER, RECEPTIONIST |
| | `appointment:checkin` | Quét QR / Check-in tiếp đón & xếp phòng | ADMIN, MANAGER, RECEPTIONIST |
| | `appointment:cancel` | Hủy lịch hẹn của bệnh nhân | ADMIN, MANAGER, RECEPTIONIST |
| **Khám Bệnh** | `clinical:read` | Xem hồ sơ bệnh án, lịch sử khám | ADMIN, MANAGER, DOCTOR |
| | `clinical:examine` | Thăm khám, chẩn đoán ICD-10 | ADMIN, DOCTOR |
| | `prescription:write` | Kê đơn thuốc điện tử | ADMIN, DOCTOR |
| | `clinical_order:create` | Chỉ định cận lâm sàng / xét nghiệm | ADMIN, DOCTOR |
| **Vận Hành** | `schedule:manage` | Phân ca trực, mở / khóa khung giờ khám | ADMIN, MANAGER |
| | `room:manage` | Cấu hình & điều phối buồng khám | ADMIN, MANAGER |
| **Tài Chính** | `finance:collect` | Thu tiền viện phí tại quầy | ADMIN, RECEPTIONIST |
| | `finance:read` | Xem báo cáo tài chính & doanh thu | ADMIN, MANAGER |
| **Nhân Sự & Hệ Thống** | `user:read` | Xem danh sách tài khoản & nhân sự | ADMIN, MANAGER |
| | `user:manage` | Quản lý tài khoản & phân quyền (RBAC) | ADMIN |

---

## 3. Lộ Trình Triển Khai Kỹ Thuật

### Giai Đoạn 1: Backend `be_clinic`
1. **Định nghĩa Permission Enums & Role Map:**
   - Tạo `src/common/constants/permissions.constant.ts` chuẩn hóa toàn bộ mã quyền và bộ quyền mặc định cho từng `UserRole`.
2. **Helper Tính Toán Quyền Hiệu Lực (Effective Permissions):**
   - Hàm `calculateEffectivePermissions(role, customPermissions)` xử lý logic gộp quyền cơ bản + cộng thêm quyền `granted` - loại trừ quyền `revoked`.
3. **Nâng cấp `PermissionsGuard` & Decorator `@RequirePermissions`:**
   - Decorator `@RequirePermissions(...AppPermission[])`.
   - Guard kiểm tra `effectivePermissions` của User thay vì so sánh cứng Role.
4. **API Quản Lý Phân Quyền Người Dùng:**
   - `GET /api/v1/permissions/catalog`: Danh mục quyền đầy đủ có phân nhóm.
   - `GET /api/v1/users/:id/permissions`: Lấy quyền chi tiết của 1 nhân viên (quyền gốc theo role + quyền tùy biến).
   - `PATCH /api/v1/users/:id/permissions`: Admin tùy biến cấp thêm / tước quyền nhân sự.
   - Đính kèm mảng `permissions` vào API `/api/v1/auth/me` và JWT session để frontend không cần tính toán lại.

---

### Giai Đoạn 2: Frontend Portal `fe_clinic_ad`
1. **Hook & Component Kiểm Tra Quyền:**
   - Hook `usePermission()`: Cung cấp hàm `hasPermission(perm)` và `hasAnyPermission(perms[])`.
   - Component `<Can permission="appointment:cancel">...</Can>`: Ẩn/Hiện nút bấm theo quyền.
2. **Nâng cấp Trang Quản Trị Nhân Sự (`RolesPermissionsPage.tsx`):**
   - Thêm nút & Modal **"Tùy biến quyền hạn" (Custom Permissions)** bên cạnh dropdown gán Role.
   - Hiển thị danh sách quyền trực quan (Checkbox theo từng nhóm chức năng):
     - Quyền mặc định theo Role (đánh dấu sẵn).
     - Cho phép Admin bỏ chọn (Tước quyền - Revoke) hoặc chọn thêm quyền ngoài vai trò (Cấp thêm - Grant).
3. **Cập nhật các nút hành động cốt lõi:**
   - Nút "Hủy lịch hẹn" ➔ bọc qua `hasPermission('appointment:cancel')`.
   - Nút "Kê đơn thuốc" ➔ bọc qua `hasPermission('prescription:write')`.
   - Menu Lịch trực, Báo cáo ➔ bọc qua permission tương ứng.

---

## 4. Xác Minh & Kiểm Thử
1. **Test tình huống 1 (Bác sĩ kiêm quản lý):**
   - User Role: `DOCTOR`.
   - Cấp thêm: `schedule:manage`, `finance:read`.
   - Kỳ vọng: Bác sĩ vừa khám bệnh được, vừa vào được trang xếp lịch trực và xem báo cáo chi nhánh.
2. **Test tình huống 2 (Lễ tân thử việc):**
   - User Role: `RECEPTIONIST`.
   - Tước quyền: `appointment:cancel`.
   - Kỳ vọng: Lễ tân vẫn check-in và thu tiền bình thường, nhưng nút "Hủy lịch" bị ẩn và nếu gọi API hủy lịch thì backend trả về `403 Forbidden`.
