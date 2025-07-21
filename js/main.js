const navButtons = document.querySelectorAll('.navbar button');
const pages = document.querySelectorAll('.page');

// 一載入就執行
document.addEventListener("DOMContentLoaded", () => {
  if (typeof renderClassCards === "function") {
    renderClassCards();
  }
});

// 點導覽按鈕切換頁面並更新班級卡片
navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const targetPage = button.dataset.page;

    pages.forEach(page => page.classList.remove("active"));
    document.getElementById(targetPage).classList.add("active");

    if (targetPage === "dashboard") {
      if (typeof renderClassCards === "function") {
        renderClassCards();
      }
    }
  });
});

//成績編輯中心按鈕
document.querySelectorAll(".navbar button").forEach(btn => {
  btn.onclick = () => {
    const target = btn.dataset.page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  };
});

function clearAllTestData() {
  localStorage.removeItem("gradeData");
  alert("已清除所有測試資料！");
  renderClassCards(); // 重新更新畫面
}

// 🌐 監聽導覽列按鈕
document.querySelectorAll(".navbar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-page");
    showPage(targetId);
  });
});

// 💡 切換頁面的函式
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  // 💡 如果切到預覽頁面，就載入學生清單
  if (id === "report-preview") {
    const currentClass = getCurrentClass();         // ⬅️ 從你的系統取目前班級
    const currentMonth = getCurrentMonth();         // ⬅️ 抓目前月份

    populateStudentList(currentClass, currentMonth);

    const select = document.getElementById("studentSelect");
    const currentStudent = select?.value;

    if (currentStudent) {
    previewReportCard(currentStudent, currentClass, currentMonth);
    }

    if (id === "dashboard") {
        if (typeof renderClassCards === "function") {
        renderClassCards();
        }
    }
  }
}

function getCurrentClass() {
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const classNames = Object.keys(data);

  // ✅ 若目前班級有「成績」，則選第一個班級
  return classNames.length > 0 ? classNames[0] : "尚未匯入班級";
}

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  return `${y}-${m}`;
}