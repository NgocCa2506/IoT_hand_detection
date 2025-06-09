// DOM Elements
const schedulerModal = document.getElementById('scheduler-modal');
const schedulerTitle = document.getElementById('scheduler-title');
const onTimeInput = document.getElementById('on-time');
const offTimeInput = document.getElementById('off-time');
const dayButtons = document.querySelectorAll('.day-btn');
const scheduleToggle = document.getElementById('schedule-toggle');
const toggleLabel = document.querySelector('.toggle-label');
const currentDatetimeElement = document.getElementById('current-datetime');

// Current device being scheduled
let currentDevice = null;
let currentDeviceName = null;
let currentRelayKey = null;

// Device schedules storage - Đảm bảo mỗi thiết bị đều có thuộc tính days là một mảng
const deviceSchedules = {
    'light': { onTime: '06:00', offTime: '22:00', days: [], active: false },
    'fan': { onTime: '18:00', offTime: '06:00', days: [], active: false },
    'tv': { onTime: '19:00', offTime: '22:00', days: [], active: false },
    'ac': { onTime: '12:00', offTime: '18:00', days: [], active: false }
};

// Day name mapping for display
const dayNames = {
    'mon': 'Thứ 2',
    'tue': 'Thứ 3',
    'wed': 'Thứ 4',
    'thu': 'Thứ 5',
    'fri': 'Thứ 6',
    'sat': 'Thứ 7',
    'sun': 'CN'
};

// Day mapping for JavaScript Date (0 = Sunday, 1 = Monday, etc.)
const dayMapping = {
    'mon': 1,
    'tue': 2,
    'wed': 3,
    'thu': 4,
    'fri': 5,
    'sat': 6,
    'sun': 0
};

// Last checked times for schedules to avoid duplicate triggers
const lastCheckedTimes = {
    'on': {},
    'off': {}
};

// Update current date and time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentDatetimeElement.textContent = now.toLocaleDateString('vi-VN', options);
    
    // Check schedules every time we update the clock (every second)
    checkSchedules();
}

// Check all device schedules and trigger actions if needed
function checkSchedules() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Get all device cards
    const deviceCards = document.querySelectorAll('.device-card');
    
    deviceCards.forEach(card => {
        const deviceType = card.dataset.device;
        const relayKey = card.dataset.relay;
        const schedule = deviceSchedules[deviceType];
        
        // Skip if schedule is not active or not defined properly
        if (!schedule || !schedule.active || !schedule.days) return;
        
        // Check if today is in the scheduled days
        // Check if today is in the scheduled days, or run every day if no days are selected
        const todayCode = Object.keys(dayMapping).find(key => dayMapping[key] === currentDay);
        const noDaysSelected = !schedule.days || schedule.days.length === 0;
        const todayIsSelected = schedule.days.includes(todayCode);

        if (!noDaysSelected && !todayIsSelected) return;

        
        // Check for ON time match
        if (schedule.onTime === currentTime) {
            // Avoid duplicate triggers
            const onTimeKey = `${relayKey}_on`;
            if (lastCheckedTimes.on[onTimeKey] !== currentTime) {
                console.log(`Schedule triggered: Turn ON ${relayKey} at ${currentTime}`);
                
                // Update Firebase
                if (window.firebaseDatabase && window.firebaseRef && window.firebaseSet) {
                    const relayRef = window.firebaseRef(window.firebaseDatabase, `relays/${relayKey}`);
                    window.firebaseSet(relayRef, true)
                        .then(() => {
                            console.log(`${relayKey} turned ON by schedule`);
                            
                            // Update UI manually in case Firebase callback is delayed
                            const iconCircle = card.querySelector('.icon-circle');
                            const statusDot = card.querySelector('.status-dot');
                            const statusText = card.querySelector('.status-text');
                            
                            iconCircle.classList.add('active');
                            statusDot.classList.remove('offline');
                            statusDot.classList.add('online');
                            statusText.textContent = `Bật • Theo lịch: ${currentTime}`;
                        })
                        .catch((error) => {
                            console.error("Error updating device state:", error);
                        });
                }
                
                // Update last checked time
                lastCheckedTimes.on[onTimeKey] = currentTime;
            }
        }
        
        // Check for OFF time match
        if (schedule.offTime === currentTime) {
            const offTimeKey = `${relayKey}_off`;

            // Avoid duplicate triggers
            if (lastCheckedTimes.off[offTimeKey] !== currentTime) {
                console.log(`Schedule triggered: Turn OFF ${relayKey} at ${currentTime}`);
                
                // Turn OFF relay in Firebase
                if (window.firebaseDatabase && window.firebaseRef && window.firebaseSet) {
                    const relayRef = window.firebaseRef(window.firebaseDatabase, `relays/${relayKey}`);
                    window.firebaseSet(relayRef, false)
                        .then(() => {
                            console.log(`${relayKey} turned OFF by schedule`);
                            
                            // Update UI status
                            const iconCircle = card.querySelector('.icon-circle');
                            const statusDot = card.querySelector('.status-dot');
                            const statusText = card.querySelector('.status-text');

                            iconCircle.classList.remove('active');
                            statusDot.classList.remove('online');
                            statusDot.classList.add('offline');
                            statusText.textContent = `Tắt • Theo lịch: ${currentTime}`;
                        })
                        .catch((error) => {
                            console.error("Error updating device state:", error);
                        });
                }

                // 🔄 Auto-deactivate one-time schedule (no repeat days)
                if (!schedule.days || schedule.days.length === 0) {
                    console.log(`Auto-deactivating one-time schedule for ${relayKey}`);
                    schedule.active = false;

                    const scheduleRef = window.firebaseRef(window.firebaseDatabase, `schedules/${relayKey}`);
                    window.firebaseSet(scheduleRef, {
                        ...schedule,
                        active: false
                    })
                    .then(() => {
                        console.log(`Schedule for ${relayKey} deactivated`);

                        // ❌ Remove schedule display from UI
                        const scheduleDisplay = card.querySelector('.schedule-display');
                        if (scheduleDisplay) {
                            scheduleDisplay.remove(); // hoặc scheduleDisplay.innerHTML = ''; tùy cách tạo
                        }
                    })
                    .catch((error) => {
                        console.error("Error deactivating schedule:", error);
                    });
                }

                // Update last checked time
                lastCheckedTimes.off[offTimeKey] = currentTime;
            }
        }

        if (!scheduleToggle.checked) {
        // Xoá lịch trong Firebase nếu bạn muốn
        const scheduleRef = firebaseRef(firebaseDatabase, `schedules/${relayKey}`);
        firebaseSet(scheduleRef, null).then(() => {
            console.log("Lịch đã bị huỷ");

            // Xoá phần lịch hiển thị trên UI
            const scheduleInfo = selectedCard.querySelector('.schedule-info');
            if (scheduleInfo) {
                scheduleInfo.textContent = ''; // hoặc scheduleInfo.innerHTML = '';
            }
        });
        return;
    }

    });
}

// Toggle device on/off when clicking the icon
function toggleDevice(event, iconElement) {
    event.stopPropagation(); // Prevent card click event
    
    const deviceCard = iconElement.closest('.device-card');
    const iconCircle = iconElement.querySelector('.icon-circle');
    const statusDot = deviceCard.querySelector('.status-dot');
    const statusText = deviceCard.querySelector('.status-text');
    const relayKey = deviceCard.dataset.relay;
    
    // Toggle active state
    const newState = !iconCircle.classList.contains('active');
    
    // Update Firebase
    if (window.firebaseDatabase && window.firebaseRef && window.firebaseSet) {
        const relayRef = window.firebaseRef(window.firebaseDatabase, `relays/${relayKey}`);
        window.firebaseSet(relayRef, newState)
            .then(() => {
                console.log(`${relayKey} state updated to ${newState}`);
            })
            .catch((error) => {
                console.error("Error updating device state:", error);
                alert("Lỗi khi cập nhật trạng thái thiết bị. Vui lòng thử lại.");
            });
    } else {
        console.error("Firebase not initialized properly");
        
        // Fallback to local update if Firebase is not available
        if (newState) {
            iconCircle.classList.add('active');
            statusDot.classList.remove('offline');
            statusDot.classList.add('online');
            statusText.textContent = `Bật • Cập nhật: ${getCurrentTime()}`;
        } else {
            iconCircle.classList.remove('active');
            statusDot.classList.remove('online');
            statusDot.classList.add('offline');
            statusText.textContent = `Tắt • Cập nhật: ${getCurrentTime()}`;
        }
    }
}

// Thêm hàm này để kiểm tra các sự kiện click
function debugCardClicks() {
    const deviceCards = document.querySelectorAll('.device-card');
    deviceCards.forEach((card, index) => {
        console.log(`Card ${index + 1} data:`, {
            device: card.dataset.device,
            relay: card.dataset.relay,
            hasClickHandler: card.onclick !== null
        });
    });
}

// Sửa lại hàm showScheduler để gỡ lỗi
function showScheduler(event, deviceName) {
    console.log("showScheduler called for:", deviceName);
    
    // Don't open scheduler if clicking on the icon
    if (event.target.closest('.device-icon')) {
        console.log("Click on icon detected, ignoring scheduler");
        return;
    }
    
    // Set modal title
    schedulerTitle.textContent = `Lịch ${deviceName}`;
    
    // Get device type from data attribute
    const deviceCard = event.currentTarget;
    console.log("Device card:", deviceCard);
    
    const deviceType = deviceCard.dataset.device;
    const relayKey = deviceCard.dataset.relay;
    
    console.log("Device data:", {
        type: deviceType,
        relay: relayKey
    });
    
    // Store reference to current device
    currentDevice = deviceType;
    currentDeviceName = deviceName;
    currentRelayKey = relayKey;
    
    // Đảm bảo thiết bị có lịch trình hợp lệ
    if (!deviceSchedules[deviceType]) {
        deviceSchedules[deviceType] = { 
            onTime: '06:00', 
            offTime: '22:00', 
            days: [], 
            active: false 
        };
    }
    
    // Đảm bảo thuộc tính days tồn tại
    if (!deviceSchedules[deviceType].days) {
        deviceSchedules[deviceType].days = [];
    }
    
    // Load existing schedule if any
    const schedule = deviceSchedules[deviceType];
    onTimeInput.value = schedule.onTime || '06:00';
    offTimeInput.value = schedule.offTime || '22:00';
    
    // Set active days
    dayButtons.forEach(btn => {
        const day = btn.dataset.day;
        // Kiểm tra xem schedule.days có tồn tại và có phải là mảng không
        if (schedule.days && Array.isArray(schedule.days) && schedule.days.includes(day)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set schedule toggle
    scheduleToggle.checked = schedule.active || false;
    toggleLabel.textContent = schedule.active ? 'Lịch Hoạt Động' : 'Lịch Không Hoạt Động';
    
    // Show modal
    schedulerModal.style.display = 'block';
}

// Close modal
function closeModal() {
    schedulerModal.style.display = 'none';
    currentDevice = null;
    currentDeviceName = null;
    currentRelayKey = null;
}

// Format days for display
function formatDays(days) {
    // Kiểm tra xem days có tồn tại và có phải là mảng không
    if (!days || !Array.isArray(days)) return 'Không lặp lại';
    if (days.length === 0) return 'Không lặp lại';
    if (days.length === 7) return 'Hàng ngày';
    
    // Check for weekdays
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const weekend = ['sat', 'sun'];
    
    const isWeekdays = weekdays.every(day => days.includes(day)) && 
                      weekend.every(day => !days.includes(day));
    
    if (isWeekdays) return 'Các ngày trong tuần';
    
    const isWeekend = weekend.every(day => days.includes(day)) && 
                     weekdays.every(day => !days.includes(day));
    
    if (isWeekend) return 'Cuối tuần';
    
    // Otherwise, list the days
    return days.map(day => dayNames[day]).join(', ');
}

// Save schedule
function saveSchedule() {
    if (!currentDevice) return;
    
    // Get selected days
    const selectedDays = [];
    dayButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
            selectedDays.push(btn.dataset.day);
        }
    });
    
    // Đảm bảo thiết bị có lịch trình hợp lệ
    if (!deviceSchedules[currentDevice]) {
        deviceSchedules[currentDevice] = { 
            onTime: '06:00', 
            offTime: '22:00', 
            days: [], 
            active: false 
        };
    }
    
    // Update device schedule
    deviceSchedules[currentDevice] = {
        onTime: onTimeInput.value,
        offTime: offTimeInput.value,
        days: selectedDays,
        active: scheduleToggle.checked
    };
    
    // Save schedule to Firebase
    if (window.firebaseDatabase && window.firebaseRef && window.firebaseSet) {
        const scheduleRef = window.firebaseRef(window.firebaseDatabase, `schedules/${currentRelayKey}`);
        window.firebaseSet(scheduleRef, {
            onTime: onTimeInput.value,
            offTime: offTimeInput.value,
            days: selectedDays,
            active: scheduleToggle.checked
        })
        .then(() => {
            console.log(`Schedule for ${currentRelayKey} saved to Firebase`);
        })
        .catch((error) => {
            console.error("Error saving schedule:", error);
            alert("Lỗi khi lưu lịch. Vui lòng thử lại.");
        });
    }
    
    // Update device card to show scheduled status
    const deviceCard = document.querySelector(`.device-card[data-device="${currentDevice}"]`);
    const statusText = deviceCard.querySelector('.status-text');
    const scheduleInfo = deviceCard.querySelector('.schedule-info');
    
    // Format times for display
    const onTimeFormatted = formatTime(onTimeInput.value);
    const offTimeFormatted = formatTime(offTimeInput.value);
    const daysFormatted = formatDays(selectedDays);
    
    if (scheduleToggle.checked) {
        // Update status text
        const isActive = deviceCard.querySelector('.icon-circle').classList.contains('active');
        statusText.textContent = `${isActive ? 'Bật' : 'Tắt'} • Đã đặt lịch`;
        
        // Show schedule info
        scheduleInfo.innerHTML = `
            <i class="fas fa-clock"></i> Bật: ${onTimeFormatted} | Tắt: ${offTimeFormatted}<br>
            <i class="fas fa-calendar-alt"></i> ${daysFormatted}
        `;
        scheduleInfo.classList.add('active');
    } else {
        // Update status text
        const isActive = deviceCard.querySelector('.icon-circle').classList.contains('active');
        statusText.textContent = `${isActive ? 'Bật' : 'Tắt'} • Cập nhật: ${getCurrentTime()}`;
        
        // Hide schedule info
        scheduleInfo.classList.remove('active');
    }
    
    // Show success message
    alert(`Đã lưu lịch cho ${currentDeviceName}`);
    
    // Close modal
    closeModal();
}

// Format time from 24h to 12h
function formatTime(time24h) {
    if (!time24h) return '00:00';
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours);
    return `${hour}:${minutes}`;
}

// Get current time in 24-hour format
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === schedulerModal) {
        closeModal();
    }
};

// Toggle day selection
dayButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});

// Toggle schedule status label
scheduleToggle.addEventListener('change', function() {
    toggleLabel.textContent = this.checked ? 'Lịch Hoạt Động' : 'Lịch Không Hoạt Động';
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    debugCardClicks();
    
    // Đảm bảo tất cả các thẻ đều có sự kiện click
    const deviceCards = document.querySelectorAll('.device-card');
    deviceCards.forEach((card, index) => {
        // Xóa sự kiện click cũ nếu có
        const oldClickHandler = card.onclick;
        card.onclick = null;
        
        // Thêm sự kiện click mới
        card.addEventListener('click', function(event) {
            console.log(`Card ${index + 1} clicked`);
            const deviceName = this.querySelector('.card-header span').textContent;
            showScheduler(event, deviceName);
        });
        
        console.log(`Reassigned click handler for card ${index + 1}`);
    });
    
    // Rest of your initialization code...
    // Update date and time initially
    updateDateTime();
    
    // Update date and time every second
    setInterval(updateDateTime, 1000);
    
    // Load schedules from Firebase
    if (window.firebaseDatabase && window.firebaseRef && window.firebaseOnValue) {
        const schedulesRef = window.firebaseRef(window.firebaseDatabase, 'schedules');
        
        window.firebaseOnValue(schedulesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Update schedules from Firebase
                Object.keys(data).forEach(relayKey => {
                    const schedule = data[relayKey];
                    const deviceCard = document.querySelector(`.device-card[data-relay="${relayKey}"]`);
                    
                    if (deviceCard) {
                        const deviceType = deviceCard.dataset.device;
                        
                        // Đảm bảo schedule có thuộc tính days là một mảng
                        if (!schedule.days) {
                            schedule.days = [];
                        }
                        
                        deviceSchedules[deviceType] = schedule;
                        
                        // Update UI if schedule is active
                        if (schedule.active) {
                            const scheduleInfo = deviceCard.querySelector('.schedule-info');
                            const statusText = deviceCard.querySelector('.status-text');
                            
                            // Format times for display
                            const onTimeFormatted = formatTime(schedule.onTime);
                            const offTimeFormatted = formatTime(schedule.offTime);
                            const daysFormatted = formatDays(schedule.days);
                            
                            // Show schedule info
                            scheduleInfo.innerHTML = `
                                <i class="fas fa-clock"></i> Bật: ${onTimeFormatted} | Tắt: ${offTimeFormatted}<br>
                                <i class="fas fa-calendar-alt"></i> ${daysFormatted}
                            `;
                            scheduleInfo.classList.add('active');
                            
                            // Update status text
                            const isActive = deviceCard.querySelector('.icon-circle').classList.contains('active');
                            statusText.textContent = `${isActive ? 'Bật' : 'Tắt'} • Đã đặt lịch`;
                        }
                    }
                });
                
                console.log("Schedules loaded from Firebase");
            }
        });
    }
});