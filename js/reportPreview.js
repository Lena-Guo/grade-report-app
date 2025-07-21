function previewReportCard(studentName, className, month) {

  const canvas = document.getElementById("reportCanvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("❌ 無法取得 canvas context，請確認 reportCanvas 是否存在！");
    return;
  }

  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const records = data[className]?.["成績"] || [];

//資料偵測機制
  const quarterStart = month; // ✅ 正確宣告
  const monthRecords = records.filter(r =>
    r["學生"] === studentName &&
    isWithinQuarter(r["上傳時間"]?.substring(0, 7), quarterStart)
  );

  // 🧠 如果沒有任何成績 ➜ 顯示提示卡
  if (monthRecords.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ✅ 灰色提示樣式
    ctx.fillStyle = "#ccc";
    ctx.font = "24px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("📄 此季度尚無成績資訊", canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillStyle = "#999";
    ctx.font = "18px sans-serif";
    ctx.fillText(`請確認 ${quarterStart} ~ ${formatQuarterEnd(quarterStart)} 之間是否有資料`, canvas.width / 2, canvas.height / 2 + 20);
    return; // 🧼 不繼續往下畫成績
  }

    const totalAvg = (
    monthRecords.reduce((sum, r) => sum + r["分數"], 0) / monthRecords.length
    ).toFixed(1);
  
  // ➤ 成績與加權平均計算
    const subjectAverages = {}; // ← 儲存每個科目的平均分數

    ["閱讀", "聽力與口說", "KK音標"].forEach(subject => {
    const subjectEntries = monthRecords.filter(r => r["科目"] === subject);
    if (subjectEntries.length === 0) {
        subjectAverages[subject] = "尚無資料";
    } else {
        const avg = subjectEntries.reduce((sum, r) => sum + r["分數"], 0) / subjectEntries.length;
        subjectAverages[subject] = avg.toFixed(1);
    }
    });
  const subjectWeights = JSON.parse(localStorage.getItem("subjectWeights") || "{}");

  let weightedTotal = 0, weightSum = 0;
  const subjectScores = {}; // ⬅️ 儲存各科成績

  monthRecords.forEach(r => {
    const score = r["分數"];
    const subject = r["科目"];
    const type = r["科目類型"];
    const weight = subjectWeights[subject]?.[type] || 0;

    weightedTotal += score * (weight / 100);
    weightSum += weight / 100;
  });

  const weightedAvg = weightSum ? (weightedTotal / weightSum).toFixed(1) : "尚無資料";
    const [year, monthOnly] = month.split("-");  // ⬅️ month 是 quarterStart，例如 "2025-07"
    const startMonth = Number(monthOnly);
    const endMonth = startMonth + 2;
    const formattedRange = `${year}-${String(startMonth).padStart(2, "0")}~${String(endMonth).padStart(2, "0")}`;


  // ➤ 欄位座標設定
  const fieldPositions = {
    "年月": [840, 60],
    "學生姓名": [620, 360],
    "班級": [385, 438],
    "閱讀平均": [750, 625],
    "聽力口說平均": [750, 705],
    "KK音標平均": [750, 780],
    "總平均": [380, 858],
    "加權平均": [580, 913],
  };

  // ➤ 背景圖片載入與繪製
  const img = new Image();
  img.src = "./data/report-template.png";

  img.onload = () => {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.font = "60px 'Niconne', cursive";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";

    // ➤ 基本資料填入
    ctx.fillText(formattedRange, ...fieldPositions["年月"]);
    ctx.fillText(`${studentName}`, ...fieldPositions["學生姓名"]);
    ctx.fillText(`${className}`, ...fieldPositions["班級"]);
    ctx.fillText(`${subjectAverages["閱讀"]} `, ...fieldPositions["閱讀平均"]);
    ctx.fillText(`${subjectAverages["聽力與口說"]} `, ...fieldPositions["聽力口說平均"]);
    ctx.fillText(`${subjectAverages["KK音標"]} `, ...fieldPositions["KK音標平均"]);
    ctx.fillText(`${totalAvg}`, ...fieldPositions["總平均"]);
    ctx.fillText(`${weightedAvg}`, ...fieldPositions["加權平均"]);
  };

  img.onerror = () => {
    console.error("❌ 圖片載入失敗：" + img.src);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f44336";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⛔ 成績單模板圖片載入失敗，請確認路徑是否正確！", canvas.width / 2, canvas.height / 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("📄 請選擇學生以預覽成績單", 280, 700);
  };
}

function downloadReportImage() {
  const canvas = document.getElementById("reportCanvas");
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "成績單.png";
  link.click();
}

//自動計算季度結束月份
function getCurrentMonth() {
  function formatQuarterEnd(quarterStart) {
    const [year, month] = quarterStart.split("-");
    const endMonth = String(Number(month) + 2).padStart(2, "0");
    return `${year}-${endMonth}`;
  }
}

function populateStudentList(className, month) {

  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const records = data[className]?.["成績"] || [];

    const students = Array.from(new Set(
    records.filter(r => r["上傳時間"].substring(0, 7) === month).map(r => r["學生"])
    ));

    const allStudents = Array.from(new Set(
    records.map(r => r["學生"])
    ));

  const select = document.getElementById("studentSelect");
  select.innerHTML = `<option value="">請選擇學生</option>`;
  students.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    if (select.value) {
      previewReportCard(select.value, className, month); // ✅ 呼叫預覽函式
    }
  };

    if (select.options.length > 1) {
    select.selectedIndex = 1; // ⬅️ 自動選第一位學生
    previewReportCard(select.value, className, month);
    }
}

const canvas = document.getElementById("reportCanvas");
const ctx = canvas.getContext("2d");

function populateClassList() {
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const classSelect = document.getElementById("classSelect");

  classSelect.innerHTML = `<option value="">請選擇班級</option>`;
  Object.keys(data).forEach(className => {
    const opt = document.createElement("option");
    opt.value = className;
    opt.textContent = className;
    classSelect.appendChild(opt);
  });
}

function populateStudentListByClass(className, month) {
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const records = data[className]?.["成績"] || [];

  const students = Array.from(new Set(
    records.filter(r => r["上傳時間"]?.substring(0, 7) === month).map(r => r["學生"])
  ));

  const select = document.getElementById("studentSelect");
  select.innerHTML = `<option value="">請選擇學生</option>`;
  students.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    if (select.value) {
      previewReportCard(select.value, className, month); // ⬅️ month 就是你選的季度
    }
  };

  if (select.options.length > 1) {
    select.selectedIndex = 1;
    previewReportCard(select.value, className, month);
  }
}

// 初始化選單＆綁定邏輯
document.addEventListener("DOMContentLoaded", () => {
  populateClassList();
  populateMonthList();

  const classSelect = document.getElementById("classSelect");
  classSelect.addEventListener("change", () => {
    const className = classSelect.value;
    const currentMonth = getCurrentMonth();
    if (className) {
      populateStudentListByClass(className, currentMonth);
    }
  });

  const monthSelect = document.getElementById("monthSelect");
  monthSelect.addEventListener("change", () => {
    const selectedMonth = monthSelect.value;
    if (selectedMonth) {
      populateClassListForMonth(selectedMonth); // ⬅️ 根據所選月份載入班級
    }
  });

    const quarterSelect = document.getElementById("quarterSelect");
    if (quarterSelect) {
    quarterSelect.addEventListener("change", () => {
        const studentSelect = document.getElementById("studentSelect");
        const quarterStart = quarterSelect.value;
        const className = document.getElementById("classSelect").value;
        const studentName = document.getElementById("studentSelect").value;

        if (quarterStart && className && studentName) {
        previewReportCard(studentName, className, quarterStart); // 改成統計整季！
        }
        if (studentSelect.options.length > 1) {
        studentSelect.selectedIndex = 1;
        previewReportCard(studentSelect.value, className, quarterStart); //每次選季度就自動選第一位學生
        }
    });
    }

    // 🌈 綁定下載整班成績單按鈕
    const btn = document.getElementById("downloadWholeClassBtn");
    if (btn) {
    btn.addEventListener("click", () => {
        const className = document.getElementById("classSelect").value;
        const month = document.getElementById("monthSelect").value;
        if (className && month) {
        downloadClassReportCardsAsZip(className, month);
        } else {
        alert("請先選班級與月份喔！");
        }
    });
    }

});

function populateMonthList() {
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const monthSet = new Set();

  for (const className in data) {
    const records = data[className]["成績"] || [];
    records.forEach(r => {
      const ym = r["上傳時間"]?.substring(0, 7);
      if (ym) monthSet.add(ym);
    });
  }

  const monthSelect = document.getElementById("monthSelect");
  monthSelect.innerHTML = `<option value="">請選擇月份</option>`;
  [...monthSet].sort().forEach(month => {
    const opt = document.createElement("option");
    opt.value = month;
    opt.textContent = month;
    monthSelect.appendChild(opt);
  });
}

function populateClassListForMonth(month) {
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const classSelect = document.getElementById("classSelect");

  const classSet = new Set();
  for (const className in data) {
    const records = data[className]["成績"] || [];
    const hasMonthData = records.some(r => r["上傳時間"]?.substring(0, 7) === month);
    if (hasMonthData) classSet.add(className);
  }

  classSelect.innerHTML = `<option value="">請選擇班級</option>`;
  [...classSet].sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    classSelect.appendChild(opt);
  });

  // 🌈 選班級 ➜ 加上視覺動畫
  classSelect.onchange = () => {
    classSelect.classList.add("selected-flash");
    setTimeout(() => classSelect.classList.remove("selected-flash"), 300);

    const selectedClass = classSelect.value;
    if (selectedClass) {
      populateStudentListByClass(selectedClass, month);
    }
  };
}

function downloadClassReportCardsAsZip(className, selectedMonth) {
  const zip = new JSZip();
  const folder = zip.folder(`${className}_ReportCards`);
  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const records = data[className]?.["成績"] || [];

  const studentList = [...new Set(
    records
      .filter(r => r["上傳時間"].includes(selectedMonth))
      .map(r => r["學生"])
  )];

  let index = 0;

  function next() {
    if (index >= studentList.length) {
      zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, `${className}_成績單.zip`);
        alert("✅ 整班成績單已匯出完成！");
      });
      return;
    }

    const studentName = studentList[index];
    previewReportCard(studentName, className, selectedMonth); // ✅ 預覽畫布

    setTimeout(() => {
      const canvas = document.getElementById("reportCanvas");
      canvas.toBlob(blob => {
        folder.file(`${studentName}.png`, blob);
        index++;
        next();
      }, "image/png");
    }, 600);
  }

  next();
}

function isWithinQuarter(monthStr, quarterStart) {
  const [startYear, startMonth] = quarterStart.split("-").map(Number);
  const [y, m] = monthStr.split("-").map(Number);

  const start = new Date(startYear, startMonth - 1);
  const end = new Date(startYear, startMonth - 1 + 3); // 三個月區間
  const target = new Date(y, m - 1);

  return target >= start && target < end;
}

function generateQuarterOptions() {
  const select = document.getElementById("quarterSelect");
  const currentYear = new Date().getFullYear();

  select.innerHTML = `<option value="">請選擇季度</option>`;

  [
    { offset: 0, month: "07", label: "上學期中（07～09月）" },
    { offset: 0, month: "10", label: "上學期末（10～12月）" },
    { offset: 1, month: "01", label: "下學期中（01～03月）" },
    { offset: 1, month: "04", label: "下學期末（04～06月）" },
  ].forEach(({ offset, month, label }) => {
    const year = currentYear + offset;
    const value = `${year}-${month}`;
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = `${year} ${label}`;
    select.appendChild(opt);
  });
}

function showQuarterMessage(value) {
  const [year, start] = value.split("-");
  const end = String(Number(start) + 2).padStart(2, "0");
  const labelMap = {
    "07": "上學期中", "10": "上學期末",
    "01": "下學期中", "04": "下學期末"
  };
  const label = labelMap[start] || "未知學期";
  const msg = `📘 正在統計：${year} ${label}（${start}～${end}月）`;

  const box = document.getElementById("quarterMessage");
  box.textContent = msg;
  box.style.display = "inline-block";
}

document.addEventListener("DOMContentLoaded", () => {
  generateQuarterOptions();

  const select = document.getElementById("quarterSelect");
  select.addEventListener("change", () => {
    if (select.value) showQuarterMessage(select.value);
  });
});