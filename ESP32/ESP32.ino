#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <FirebaseESP32.h>

// WiFi credentials
const char* ssid = "Ngoc Ca";
const char* password = "123456789";

// Thông tin Firebase
#define FIREBASE_HOST "https://mediapipe-91dac-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "ZTTSHOAXebsLlm8QCvvmWmX3Tism1DQp9uBnk9m8"

// Cấu hình Firebase
FirebaseData firebaseData;
FirebaseConfig firebaseCauHinh;
FirebaseAuth firebaseXacThuc;

// Web server setup
WebServer server(80);

// OLED screen config
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// GPIOs for relays and signal LED
#define RELAY1 23
#define RELAY2 18
#define RELAY3 2
#define RELAY4 14
#define SIGNAL_LED 16

// Relay states
bool relay_1 = false, relay_2 = false, relay_3 = false, relay_4 = false;
int currentFingerCount = -1;

// ------------ Setup ------------
void setup() {
  Serial.begin(115200);

  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);
  pinMode(RELAY4, OUTPUT);
  pinMode(SIGNAL_LED, OUTPUT);

  digitalWrite(RELAY1, HIGH);
  digitalWrite(RELAY2, HIGH);
  digitalWrite(RELAY3, HIGH);
  digitalWrite(RELAY4, HIGH);
  digitalWrite(SIGNAL_LED, LOW);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED khởi tạo thất bại"));
    for (;;);
  }

  WiFi.begin(ssid, password);
  Serial.print("Đang kết nối WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi đã kết nối");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/count", HTTP_POST, handleCount);
  server.begin();

  firebaseCauHinh.database_url = FIREBASE_HOST;
  firebaseCauHinh.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&firebaseCauHinh, &firebaseXacThuc);
  Firebase.reconnectWiFi(true);

  getRelayStatusFromFirebase();
}

// ------------ Main Loop ------------
void loop() {
  server.handleClient();
  getRelayStatusFromFirebase();

  // Hiển thị trạng thái relay
  displayRelayStatus();
}

// ------------ Server Handler ------------
void handleCount() {
  if (!server.hasArg("count")) {
    server.send(400, "text/plain", "Thiếu tham số 'count'");
    return;
  }

  String countStr = server.arg("count");
  if (countStr.toInt() == 0 && countStr != "0") {
    server.send(400, "text/plain", "Dữ liệu không hợp lệ");
    return;
  }

  int numFingers = countStr.toInt();
  Serial.print("Số ngón tay: ");
  Serial.println(numFingers);

  currentFingerCount = numFingers;
  switch (numFingers) {
    case 1:
      relay_1 = !relay_1;
      digitalWrite(RELAY1, relay_1 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF
      somot(); break;
    case 2:
      relay_2 = !relay_2;
      digitalWrite(RELAY2, relay_2 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF
      sohai(); break;
    case 3:
      relay_3 = !relay_3;
      digitalWrite(RELAY3, relay_3 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF
      soba(); break;
    case 4:
      relay_4 = !relay_4;
      digitalWrite(RELAY4, relay_4 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF
      sobon(); break;
    case 5:
      digitalWrite(RELAY1, LOW);  // Tắt tất cả relay
      digitalWrite(RELAY2, LOW);
      digitalWrite(RELAY3, LOW);
      digitalWrite(RELAY4, LOW);
      relay_1 = relay_2 = relay_3 = relay_4 = false;
      sonam(); break;
    default:
      server.send(400, "text/plain", "Giá trị không hợp lệ");
      return;
  }

  // Gửi trạng thái lên Firebase
  Firebase.setBool(firebaseData, "/relays/relay_1", relay_1);
  Firebase.setBool(firebaseData, "/relays/relay_2", relay_2);
  Firebase.setBool(firebaseData, "/relays/relay_3", relay_3);
  Firebase.setBool(firebaseData, "/relays/relay_4", relay_4);

  // Báo hiệu nhận lệnh
  digitalWrite(SIGNAL_LED, HIGH);
  delay(200);
  digitalWrite(SIGNAL_LED, LOW);

  server.send(200, "text/plain", "OK");
}

// ------------ Hiển thị trạng thái relay ------------
void displayRelayStatus() {
  display.clearDisplay();
  
  display.setTextSize(1);   // Cỡ chữ lớn
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 10);
  display.print("Relay 1: ");
  display.println(relay_1 ? "ON" : "OFF");

  display.setCursor(0, 20);
  display.print("Relay 2: ");
  display.println(relay_2 ? "ON" : "OFF");

  display.setCursor(0, 30);
  display.print("Relay 3: ");
  display.println(relay_3 ? "ON" : "OFF");

  display.setCursor(0, 40);
  display.print("Relay 4: ");
  display.println(relay_4 ? "ON" : "OFF");

  display.display();
}

void getRelayStatusFromFirebase() {
  // Lấy dữ liệu từ Firebase về trạng thái relay
  Firebase.getBool(firebaseData, "/relays/relay_1");
  relay_1 = firebaseData.boolData();
  digitalWrite(RELAY1, relay_1 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF

  Firebase.getBool(firebaseData, "/relays/relay_2");
  relay_2 = firebaseData.boolData();
  digitalWrite(RELAY2, relay_2 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF

  Firebase.getBool(firebaseData, "/relays/relay_3");
  relay_3 = firebaseData.boolData();
  digitalWrite(RELAY3, relay_3 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF

  Firebase.getBool(firebaseData, "/relays/relay_4");
  relay_4 = firebaseData.boolData();
  digitalWrite(RELAY4, relay_4 ? HIGH : LOW); // HIGH -> Relay ON, LOW -> Relay OFF
}

// ------------ Các hàm vẽ số  ------------
void somot() {
  display.clearDisplay();
  display.fillRect(61, 5, 9, 53, SSD1306_WHITE);
  display.display();
}

void sohai() {
  display.clearDisplay();
  display.fillRect(41, 8, 46, 9, SSD1306_WHITE);
  display.fillRect(78, 17, 9, 13, SSD1306_WHITE);
  display.fillRect(41, 29, 46, 9, SSD1306_WHITE);
  display.fillRect(41, 38, 10, 12, SSD1306_WHITE);
  display.fillRect(41, 50, 45, 9, SSD1306_WHITE);
  display.display();
}

void soba() {
  display.clearDisplay();
  display.fillRect(41, 8, 46, 9, SSD1306_WHITE);
  display.fillRect(78, 17, 9, 13, SSD1306_WHITE);
  display.fillRect(41, 29, 46, 9, SSD1306_WHITE);
  display.fillRect(41, 50, 45, 9, SSD1306_WHITE);
  display.fillRect(78, 38, 9, 21, SSD1306_WHITE);
  display.display();
}

void sobon() {
  display.clearDisplay();
  display.fillRect(47, 4, 12, 39, SSD1306_WHITE);
  display.fillRect(47, 43, 36, 11, SSD1306_WHITE);
  display.fillRect(66, 37, 11, 22, SSD1306_WHITE);
  display.display();
}

void sonam() {
  display.clearDisplay();
  display.fillRect(37, 5, 46, 9, SSD1306_WHITE);
  display.fillRect(37, 28, 46, 9, SSD1306_WHITE);
  display.fillRect(37, 50, 46, 9, SSD1306_WHITE);
  display.fillRect(37, 14, 11, 14, SSD1306_WHITE);
  display.fillRect(71, 37, 12, 13, SSD1306_WHITE);
  display.display();
}