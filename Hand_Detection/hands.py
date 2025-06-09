# Import thư viện cần thiết
import cv2                         # Thư viện xử lý ảnh/video
import mediapipe as mp            # Thư viện nhận dạng tay
import time                       # Xử lý thời gian
import requests                   # Gửi HTTP request

# Địa chỉ IP của ESP32
ESP32_IP = "http://172.20.10.2"
SEND_URL = f"{ESP32_IP}/count"   # URL dùng để gửi dữ liệu ngón tay đến ESP32

# Hàm gửi số lượng ngón tay đến ESP32
def send_count_to_esp32(count):
    try:
        # Gửi POST request với dữ liệu là số ngón tay
        response = requests.post(SEND_URL, data={"count": str(count)}, timeout=2)
        print("Đã gửi đến ESP32:", count, "| Phản hồi:", response.text)
    except Exception as e:
        print("Lỗi gửi dữ liệu đến ESP32:", e)

# Khởi tạo MediaPipe Hands
mphands = mp.solutions.hands
hands = mphands.Hands(
    model_complexity = 1,                  # Đơn giản hóa mô hình
    min_detection_confidence = 0.5,        # Ngưỡng phát hiện tay
    min_tracking_confidence = 0.5          # Ngưỡng theo dõi tay
)
mp_drawing = mp.solutions.drawing_utils  # Công cụ vẽ landmark bàn tay

# Khởi động webcam
cap = cv2.VideoCapture(0)

# Biến lưu giá trị đếm trước đó và trạng thái ổn định
prev_count = -1
stable_time = None
sent = False

# Vòng lặp chính để đọc từng frame từ webcam
while cap.isOpened():
    success, img = cap.read()
    if not success:
        break  # Thoát nếu không đọc được ảnh

    # Chuyển ảnh từ BGR sang RGB để dùng cho MediaPipe
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = hands.process(img_rgb)  # Phân tích hình ảnh tìm bàn tay
    img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)  # Chuyển lại BGR để hiển thị

    count = 0        # Biến đếm ngón tay
    myHand = []      # Danh sách lưu tọa độ các điểm landmark

    if result.multi_hand_landmarks:  # Nếu phát hiện tay
        for hand in result.multi_hand_landmarks:
            myHand = []
            for lm in hand.landmark:
                h, w, c = img.shape
                myHand.append([int(lm.x * w), int(lm.y * h)])  # Tọa độ pixel

            # Xác định tay phải hay trái dựa vào vị trí điểm 4 và 20
            isRightHand = myHand[4][0] > myHand[20][0]

            # Kiểm tra ngón tay nào đang được giơ lên (đầu ngón cao hơn đốt giữa)
            if myHand[8][1] < myHand[6][1]:    # Ngón trỏ
                count += 1
            if myHand[12][1] < myHand[10][1]:  # Ngón giữa
                count += 1
            if myHand[16][1] < myHand[14][1]:  # Ngón áp út
                count += 1
            if myHand[20][1] < myHand[18][1]:  # Ngón út
                count += 1

            # Kiểm tra ngón cái dựa vào hướng trái/phải
            if isRightHand:
                if myHand[4][0] > myHand[2][0]:  # Tay phải, ngón cái hướng phải
                    count += 1
            else:
                if myHand[4][0] < myHand[2][0]:  # Tay trái, ngón cái hướng trái
                    count += 1

    # Kiểm tra xem số ngón tay có giữ ổn định hay không
    current_time = time.time()
    if count == prev_count:
        if stable_time is None:
            stable_time = current_time  # Bắt đầu đếm thời gian ổn định
        elif current_time - stable_time >= 2 and not sent:
            send_count_to_esp32(count)  # Gửi dữ liệu nếu ổn định 2 giây
            sent = True                 # Tránh gửi trùng
    else:
        stable_time = current_time      # Reset thời gian nếu số lượng thay đổi
        sent = False
        prev_count = count              # Cập nhật số lượng đếm mới

    # Hiển thị ảnh với số lượng ngón tay
    cv2.putText(img, f"Count: {count}", (50, 100), cv2.FONT_HERSHEY_PLAIN, 3, (0, 0, 255), 2)
    cv2.imshow("Secure Finger Count", img)  # Mở cửa sổ hiển thị

    # Nhấn 'q' để thoát
    if cv2.waitKey(1) == ord("q"):
        break

# Giải phóng tài nguyên
cap.release()
cv2.destroyAllWindows()