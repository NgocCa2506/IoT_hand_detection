# 🖐️ Nhận Diện Cử Chỉ Bàn Tay Điều Khiển Thiết Bị Điện Thông Minh Kết Hợp IoT

> **Đồ Án Chuyên Ngành 1** – Trường Đại học Công nghệ Thông tin & Truyền thông Việt – Hàn  
> Khoa Kỹ thuật Máy tính và Điện tử

---

## 📌 Giới Thiệu

Dự án nghiên cứu và xây dựng một hệ thống điều khiển thiết bị điện thông minh (đèn, quạt, ...) thông qua nhận diện cử chỉ bàn tay trong thời gian thực, kết hợp với nền tảng IoT để truyền lệnh điều khiển và giám sát từ xa.

Hệ thống sử dụng **MediaPipe** để nhận diện cử chỉ tay từ camera, giao tiếp với vi điều khiển **ESP32** qua WiFi (HTTP), và đồng bộ trạng thái thiết bị lên **Firebase Realtime Database** để giám sát qua giao diện web.

---

## 👤 Thông Tin Sinh Viên

| Thông tin | Chi tiết |
|-----------|----------|
| **Sinh viên thực hiện** | Nguyễn Ngọc Ca |
| **Mã sinh viên** | 22CE009 |
| **Lớp** | 22ES |
| **Giảng viên hướng dẫn** | TS. Nguyễn Vũ Anh Quang |
| **Thời gian** | Tháng 5 năm 2025 |

---

## 🎯 Mục Tiêu

- Xây dựng hệ thống điều khiển thiết bị điện bằng nhận diện cử chỉ tay kết hợp IoT.
- Giám sát và điều khiển thiết bị từ xa thông qua giao diện web.
- Tăng tính tiện lợi, tiết kiệm năng lượng và hỗ trợ người dùng trong sinh hoạt hằng ngày.
- Tích hợp công nghệ nhận diện cử chỉ tay vào các hệ thống nhà thông minh.

---

## 🏗️ Kiến Trúc Hệ Thống

```
Camera (Webcam)
      │
      ▼
Nhận diện cử chỉ tay (Python + MediaPipe + OpenCV)
      │  HTTP POST (WiFi)
      ▼
Vi điều khiển ESP32
      │                   │
      ▼                   ▼
Relay/Thiết bị điện    Firebase Realtime DB
(Đèn, quạt, ...)            │
                            ▼
                       Giao diện Website
```

---

## 🛠️ Công Nghệ Sử Dụng

### Phần mềm
| Công nghệ | Mô tả |
|-----------|-------|
| **Python** | Ngôn ngữ lập trình chính cho hệ thống nhận diện |
| **MediaPipe** | Framework nhận diện bàn tay (21 landmarks) của Google |
| **OpenCV** | Thư viện xử lý ảnh và hiển thị kết quả |
| **Firebase Realtime DB** | Lưu trữ và đồng bộ trạng thái thiết bị |
| **Arduino IDE** | Lập trình vi điều khiển ESP32 |
| **Visual Studio Code** | Trình soạn thảo mã nguồn |

### Phần cứng
| Linh kiện | Mô tả |
|-----------|-------|
| **ESP32** | Vi điều khiển WiFi + Bluetooth, lõi kép 240MHz |
| **Relay Module (x4)** | Điều khiển bật/tắt thiết bị điện |
| **Màn hình OLED SSD1306** | Hiển thị trạng thái relay (128x64px, I2C) |
| **Transistor BC547** | Điều khiển relay từ GPIO của ESP32 |
| **Webcam** | Thu nhận hình ảnh bàn tay |

---

## ⚙️ Nguyên Lý Hoạt Động

### Luồng nhận diện cử chỉ (Python)
1. Camera thu hình ảnh bàn tay theo thời gian thực
2. MediaPipe xác định 21 điểm đặc trưng (landmarks) trên bàn tay
3. Chương trình đếm số ngón tay đang giơ lên dựa vào tọa độ các điểm
4. Kết quả được giữ ổn định trong 2 giây trước khi gửi lệnh
5. Gửi số ngón tay đến ESP32 qua HTTP POST

### Luồng điều khiển (ESP32)
| Số ngón tay | Hành động |
|-------------|-----------|
| 1 | Toggle Relay 1 |
| 2 | Toggle Relay 2 |
| 3 | Toggle Relay 3 |
| 4 | Toggle Relay 4 |
| 5 | Tắt toàn bộ relay |
| 0 | Không thay đổi |

---

## 📦 Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống
- Python 3.8+
- Webcam
- ESP32 kết nối cùng mạng WiFi
- Tài khoản Firebase

### 1. Clone repository
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### 2. Cài đặt thư viện Python
```bash
pip install mediapipe opencv-python requests
```

### 3. Cấu hình Firebase
- Truy cập [Firebase Console](https://console.firebase.google.com)
- Tạo project mới → Realtime Database
- Lấy thông tin `Firebase Host` và `Auth Key`
- Cập nhật thông tin vào file cấu hình của dự án

### 4. Nạp code lên ESP32
- Mở Arduino IDE
- Cài đặt board ESP32 và thư viện cần thiết:
  - `FirebaseESP32`
  - `Adafruit SSD1306`
  - `Adafruit GFX Library`
- Cập nhật thông tin WiFi và Firebase trong file `.ino`
- Nạp code lên ESP32

### 5. Chạy chương trình nhận diện
```bash
python main.py
```

---

## 🔌 Sơ Đồ Kết Nối Phần Cứng

| ESP32 GPIO | Kết nối |
|------------|---------|
| D23 | Relay 1 (qua BC547 + R 3kΩ) |
| D18 | Relay 2 (qua BC547 + R 3kΩ) |
| D2  | Relay 3 (qua BC547 + R 3kΩ) |
| D14 | Relay 4 (qua BC547 + R 3kΩ) |
| GPIO 22 | OLED SCL |
| GPIO 21 | OLED SDA |
| 3.3V | OLED VCC |
| GND | OLED GND + Emitter BC547 |

---

## 📊 Kết Quả Đạt Được

- ✅ Nhận diện chính xác 0–5 ngón tay trong thời gian thực, độ trễ thấp
- ✅ Giao tiếp WiFi giữa Python và ESP32 qua HTTP ổn định
- ✅ Điều khiển 4 relay (đèn/quạt) thành công qua cử chỉ tay
- ✅ Đồng bộ trạng thái thiết bị lên Firebase
- ✅ Giao diện web giám sát và điều khiển từ xa
- ✅ Hiển thị trạng thái relay trên màn hình OLED

---

## 🚀 Hướng Phát Triển

- Mở rộng tập cử chỉ nhận diện (OK, L, nắm tay, vẫy tay,...)
- Tích hợp mô hình học máy/deep learning để tăng độ chính xác
- Phát triển ứng dụng mobile (Android/iOS)
- Tích hợp thêm cảm biến (nhiệt độ, ánh sáng, chuyển động)
- Hỗ trợ điều khiển cho người khuyết tật
- Tối ưu tiêu thụ điện năng của ESP32

---

## 📚 Tài Liệu Tham Khảo

1. Google. *MediaPipe Hands*. [https://developers.google.com/mediapipe/solutions/vision/hand_landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
2. OpenCV. *Open Source Computer Vision Library*. [https://opencv.org/](https://opencv.org/)
3. MicroPython. *ESP32 Documentation*. [https://docs.micropython.org/en/latest/esp32/](https://docs.micropython.org/en/latest/esp32/)
4. H. Zhang et al., "Gesture Recognition Based on Deep Learning and Human Skeleton Data," *IEEE Access*, vol. 8, 2020.

---

## 📄 Giấy Phép

Dự án này được thực hiện phục vụ mục đích học thuật tại Trường Đại học Công nghệ Thông tin & Truyền thông Việt – Hàn.

---

<p align="center">
  Made with ❤️ by <strong>Nguyễn Ngọc Ca</strong> – VKU 2025
</p>
